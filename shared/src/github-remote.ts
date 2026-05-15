/** Strip trailing `.git` (any case). */
function stripDotGit(name: string): string {
  return name.replace(/\.git$/i, '')
}

/**
 * Parse `owner` and `repo` from a GitHub HTTPS or SSH remote URL.
 * Returns null if the URL is not a github.com repository remote.
 */
export function parseGithubRepoFromRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim()
  if (!trimmed) return null

  const ssh = /^git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/i.exec(trimmed)
  if (ssh?.[1] && ssh[2]) {
    return { owner: ssh[1], repo: stripDotGit(ssh[2]) }
  }

  try {
    const u = new URL(trimmed)
    const host = u.hostname.toLowerCase()
    if (host !== 'github.com' && host !== 'www.github.com') return null
    const segments = u.pathname.split('/').filter(Boolean)
    const owner = segments[0]
    const repoSeg = segments[1]
    if (!owner || !repoSeg) return null
    return { owner, repo: stripDotGit(repoSeg) }
  } catch {
    return null
  }
}

/** GitHub Pages project site URL (`https://owner.github.io/repo`). */
export function buildGithubPagesProjectUrl(owner: string, repo: string): string {
  const o = owner.trim()
  const r = repo.trim()
  if (!o || !r) return ''
  return `https://${o}.github.io/${r}`
}

function repoNameFromLocalDirectory(localDirectory: string): string {
  const normalized = localDirectory.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

/**
 * Resolve the deployed GitHub Pages URL for an anthology catalog entry.
 * Prefers owner/repo from `remoteUrl`; falls back to signed-in `githubLogin` + local folder name.
 */
export function resolveGithubPagesUrl(
  workspace: { remoteUrl?: string; localDirectory: string },
  githubLogin?: string
): string | null {
  const fromRemote = workspace.remoteUrl?.trim()
    ? parseGithubRepoFromRemoteUrl(workspace.remoteUrl)
    : null
  if (fromRemote) {
    const url = buildGithubPagesProjectUrl(fromRemote.owner, fromRemote.repo)
    return url || null
  }
  const owner = githubLogin?.trim()
  const repo = repoNameFromLocalDirectory(workspace.localDirectory)
  if (!owner || !repo) return null
  const url = buildGithubPagesProjectUrl(owner, repo)
  return url || null
}
