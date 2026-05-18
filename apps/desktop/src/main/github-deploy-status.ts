import path from 'node:path'
import simpleGit from 'simple-git'
import {
  buildGithubPagesProjectUrl,
  parseGithubRepoFromRemoteUrl,
  type GitHubDeployStatus
} from '@emprint/shared'
import type { WorkspaceCatalogEntry } from '@emprint/shared'

const DEPLOY_WORKFLOW_FILE = 'deploy-astro-gh-pages.yml'
const GITHUB_API = 'https://api.github.com'

export interface GithubDeployStatusContext {
  readSession(): Promise<{ accessToken: string; login?: string } | null>
  readCatalog(): Promise<WorkspaceCatalogEntry[]>
  getMountedWorkspaceRoot(): string
}

interface WorkflowRun {
  status?: string
  conclusion?: string | null
  html_url?: string
  created_at?: string
  name?: string
  path?: string
}

interface PagesInfo {
  status?: string | null
  html_url?: string | null
}

function sanitizeGithubRemoteUrl(remoteUrl: string): string {
  const trimmed = remoteUrl.trim()
  if (!trimmed) return trimmed
  try {
    const u = new URL(trimmed)
    u.username = ''
    u.password = ''
    return u.toString()
  } catch {
    return trimmed.replace(/https:\/\/[^@/]+@/i, 'https://')
  }
}

async function resolveGithubRepoRef(
  ctx: GithubDeployStatusContext
): Promise<{ owner: string; repo: string } | null> {
  const root = path.resolve(ctx.getMountedWorkspaceRoot())
  try {
    const git = simpleGit(root)
    const remotes = await git.getRemotes(true)
    const origin = remotes.find((r) => r.name === 'origin') ?? remotes[0]
    const url = origin?.refs.fetch || origin?.refs.push
    if (url) {
      const ref = parseGithubRepoFromRemoteUrl(sanitizeGithubRemoteUrl(url))
      if (ref) return ref
    }
  } catch {
    // fall through to catalog
  }

  const catalog = await ctx.readCatalog()
  const entry = catalog.find((e) => path.resolve(e.localDirectory) === root)
  const remoteUrl = entry?.remoteUrl?.trim()
  if (!remoteUrl) return null
  return parseGithubRepoFromRemoteUrl(remoteUrl)
}

async function githubApiGetJson(url: string, token: string): Promise<{ ok: true; data: unknown } | { ok: false; status: number }> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Emprint'
    }
  })
  if (!res.ok) {
    return { ok: false, status: res.status }
  }
  return { ok: true, data: await res.json() }
}

async function findDeployWorkflowId(owner: string, repo: string, token: string): Promise<number | null> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows`
  const res = await githubApiGetJson(url, token)
  if (!res.ok) return null
  const workflows = (res.data as { workflows?: Array<{ id?: number; path?: string }> }).workflows ?? []
  const match =
    workflows.find((w) => w.path?.includes(DEPLOY_WORKFLOW_FILE)) ??
    workflows.find((w) => w.path?.toLowerCase().includes('deploy-astro-gh-pages'))
  return typeof match?.id === 'number' ? match.id : null
}

async function fetchLatestDeployRun(
  owner: string,
  repo: string,
  token: string,
  workflowId: number | null
): Promise<WorkflowRun | null> {
  const branch = 'main'
  const base = workflowId
    ? `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${workflowId}/runs`
    : `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs`

  const url = `${base}?per_page=5&branch=${encodeURIComponent(branch)}&event=push`
  const res = await githubApiGetJson(url, token)
  if (!res.ok) return null

  const runs = (res.data as { workflow_runs?: WorkflowRun[] }).workflow_runs ?? []
  if (workflowId) {
    return runs[0] ?? null
  }
  return (
    runs.find((run) => {
      const pathName = run.path ?? ''
      const name = run.name ?? ''
      return pathName.includes(DEPLOY_WORKFLOW_FILE) || /deploy astro/i.test(name)
    }) ?? runs[0] ??
    null
  )
}

async function fetchPagesInfo(owner: string, repo: string, token: string): Promise<PagesInfo | null> {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pages`
  const res = await githubApiGetJson(url, token)
  if (!res.ok) return null
  return res.data as PagesInfo
}

function mapDeployPhase(run: WorkflowRun | null, pages: PagesInfo | null): GitHubDeployStatus['phase'] {
  if (!run) return 'queued'

  const status = (run.status ?? '').toLowerCase()
  const conclusion = (run.conclusion ?? '').toLowerCase()

  if (status === 'queued' || status === 'waiting' || status === 'pending' || status === 'requested') {
    return 'queued'
  }
  if (status === 'in_progress') {
    return 'in_progress'
  }

  if (status === 'completed') {
    if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'cancelled') {
      return 'failed'
    }
    if (conclusion === 'success') {
      const pagesStatus = (pages?.status ?? '').toLowerCase()
      if (pagesStatus === 'errored') return 'failed'
      if (pagesStatus === 'building') return 'in_progress'
      return 'live'
    }
    if (conclusion === 'skipped' || conclusion === 'neutral') {
      return 'unknown'
    }
    return 'unknown'
  }

  return 'in_progress'
}

export async function fetchGithubDeployStatus(ctx: GithubDeployStatusContext): Promise<GitHubDeployStatus> {
  const session = await ctx.readSession()
  if (!session) {
    return {
      phase: 'no_session',
      message: 'Sign in with GitHub to check deploy status.'
    }
  }

  let repoRef: { owner: string; repo: string } | null
  try {
    repoRef = await resolveGithubRepoRef(ctx)
  } catch {
    repoRef = null
  }

  if (!repoRef) {
    return {
      phase: 'no_remote',
      message: 'No GitHub remote is configured for this workspace.'
    }
  }

  const { owner, repo } = repoRef
  const pagesUrl = buildGithubPagesProjectUrl(owner, repo) || undefined

  try {
    const workflowId = await findDeployWorkflowId(owner, repo, session.accessToken)
    const [run, pages] = await Promise.all([
      fetchLatestDeployRun(owner, repo, session.accessToken, workflowId),
      fetchPagesInfo(owner, repo, session.accessToken)
    ])

    const phase = mapDeployPhase(run, pages)
    const workflowRunUrl = typeof run?.html_url === 'string' ? run.html_url : undefined
    const liveUrl =
      phase === 'live'
        ? (typeof pages?.html_url === 'string' && pages.html_url) || pagesUrl
        : pagesUrl

    return {
      phase,
      ...(liveUrl ? { pagesUrl: liveUrl } : {}),
      ...(workflowRunUrl ? { workflowRunUrl } : {}),
      ...(run?.name ? { workflowName: run.name } : {}),
      ...(run?.created_at ? { updatedAt: run.created_at } : {})
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      phase: 'unknown',
      message,
      ...(pagesUrl ? { pagesUrl } : {})
    }
  }
}
