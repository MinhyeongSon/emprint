import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { useAppStore } from '@renderer/state/app-store'
import {
  parseGithubRepoFromRemoteUrl,
  resolveGithubPagesUrl,
  type SiteProjectKind,
  type WorkspaceCatalogEntry,
  type WorkspaceConfig
} from '@emprint/shared'
import { Sidebar } from '@renderer/features/shell/sidebar'
import { cn } from '@renderer/lib/cn'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function slugifyRepoName(value: string): string {
  return (
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      // allow unicode letters/numbers so Korean titles still produce stable slugs
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'emprint-workspace'
  )
}

/** Decorative wireframe: blog index (posts list). */
function BlogLayoutPreview() {
  return (
    <div className="pointer-events-none aspect-[16/10] w-full max-h-[140px] select-none overflow-hidden rounded-lg border border-border/80 bg-base/40 p-2.5 shadow-inner sm:max-h-[160px]">
      <div className="mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
        <div className="h-1.5 w-1/4 rounded-full bg-muted/40" />
        <div className="ml-auto h-1 w-8 rounded-full bg-muted/30" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <div className="mt-0.5 h-8 w-10 shrink-0 rounded bg-muted/25" />
            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              <div className="h-1 w-[70%] rounded-full bg-ink/14" />
              <div className="h-0.5 w-full rounded-full bg-ink/8" />
              <div className="h-0.5 w-[45%] rounded-full bg-ink/8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Decorative wireframe: portfolio hero + project grid. */
function PortfolioLayoutPreview() {
  return (
    <div className="pointer-events-none aspect-[16/10] w-full max-h-[140px] select-none overflow-hidden rounded-lg border border-border/80 bg-base/40 p-2.5 shadow-inner sm:max-h-[160px]">
      <div className="mb-2 h-[32%] min-h-[40px] rounded-md bg-gradient-to-br from-accent/40 via-muted/10 to-panel2" />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm border border-border/50 bg-muted/15"
          />
        ))}
      </div>
    </div>
  )
}

export function WorkspaceHub() {
  const locale = useAppStore((state) => state.locale)
  const workspaces = useAppStore((state) => state.workspaces)
  const setWorkspaces = useAppStore((state) => state.setWorkspaces)
  const enterWorkspace = useAppStore((state) => state.enterWorkspace)
  const workspaceRootDir = useAppStore((state) => state.workspaceRootDir)
  const githubConnected = useAppStore((state) => state.githubConnected)
  const githubLogin = useAppStore((state) => state.githubLogin)
  const setGithubSession = useAppStore((state) => state.setGithubSession)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createTitle, setCreateTitle] = useState(locale === 'ko' ? '새 앤솔로지' : 'New anthology')
  const [createDescription, setCreateDescription] = useState('')
  const [createRemoteUrl, setCreateRemoteUrl] = useState('')
  const [createOnGithub, setCreateOnGithub] = useState(true)
  const [syncAfterCreate, setSyncAfterCreate] = useState(true)
  const [siteProjectKind, setSiteProjectKind] = useState<SiteProjectKind>('column')
  const [suggestedRepoName, setSuggestedRepoName] = useState<string | null>(null)
  const [removeConfirmWorkspace, setRemoveConfirmWorkspace] = useState<WorkspaceCatalogEntry | null>(null)
  const [removeConfirmAlsoRemote, setRemoveConfirmAlsoRemote] = useState(false)
  const [removeConfirmBusy, setRemoveConfirmBusy] = useState(false)
  const hubCatalogRefreshToken = useAppStore((s) => s.hubCatalogRefreshToken)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const catalog = window.emprint?.catalog
    if (!catalog?.list) {
      setError(locale === 'ko' ? '앱 API를 불러오지 못했습니다. 앱을 다시 시작해 주세요.' : 'Failed to load app API. Please restart the app.')
      setLoading(false)
      return () => {
        alive = false
      }
    }

    void catalog.list()
      .then((entries) => {
        if (!alive) return
        setWorkspaces(entries)
      })
      .catch((caught) => {
        if (!alive) return
        setError(caught instanceof Error ? caught.message : locale === 'ko' ? '앤솔로지 목록을 불러오지 못했습니다.' : 'Failed to load anthologies.')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [hubCatalogRefreshToken, locale, setWorkspaces])

  useEffect(() => {
    if (!window.emprint?.github?.authStatus) return
    let alive = true
    void window.emprint.github
      .authStatus()
      .then((status) => {
        if (!alive) return
        setGithubSession({ connected: status.connected, login: status.login })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [setGithubSession])

  /** Showcase workspace UI is not ready; keep selection on column when the create panel opens. */
  useEffect(() => {
    if (createOpen && siteProjectKind === 'showcase') {
      setSiteProjectKind('column')
    }
  }, [createOpen, siteProjectKind])

  const sorted = useMemo(
    () => [...workspaces].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [workspaces]
  )

  useEffect(() => {
    // keep title as the single source of truth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openWorkspace(localDirectory: string, workspaceId: string) {
    setError(null)
    try {
      const api = window.emprint?.workspace
      if (!api?.open) {
        throw new Error(locale === 'ko' ? '워크스페이스 API를 불러오지 못했습니다.' : 'Workspace API unavailable.')
      }
      const result = await api.open({ localDirectory })
      // Minimal config for now; hub will eventually own full config.
      enterWorkspace(
        {
          workspaceId,
          workspaceConfig: {
            authProvider: 'github',
            locale,
            workspaceType: result.manifest.workspaceType,
            siteProjectKind: result.manifest.siteProjectKind ?? 'column',
            templateId: result.manifest.templateId,
            title: result.manifest.title,
            description: result.manifest.description,
            themeColor: result.manifest.themeColor,
            layoutStyle: result.manifest.layoutStyle,
            localDirectory: result.workspaceRoot,
            repository: {
              mode: 'create',
              providerId: 'github'
            }
          },
          workspaceResult: result
        }
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : locale === 'ko' ? '앤솔로지를 열지 못했습니다.' : 'Failed to open anthology.')
    }
  }

  async function createNewWorkspace() {
    setError(null)
    setSuggestedRepoName(null)
    if (!workspaceRootDir?.trim()) {
      setError(locale === 'ko' ? '먼저 워크스페이스 루트 폴더를 선택해 주세요.' : 'Please select a workspace root folder first.')
      return
    }

    if (!createDescription.trim()) {
      setError(locale === 'ko' ? '설명을 입력해 주세요.' : 'Please enter a description.')
      return
    }

    const api = window.emprint
    if (!api?.workspace?.initialize || !api?.catalog?.add || !api?.catalog?.list) {
      setError(locale === 'ko' ? '앱 API를 불러오지 못했습니다. 앱을 다시 시작해 주세요.' : 'Failed to load app API. Please restart the app.')
      return
    }

    const repoName = slugifyRepoName(createTitle)
    const localDirectory = `${workspaceRootDir.replace(/\/+$/g, '')}/${repoName}`
    const now = new Date().toISOString()
    let remoteUrl = createRemoteUrl.trim() || undefined
    setCreating(true)

    try {
      if (createOnGithub) {
        if (!api.github?.repoCreate) {
          throw new Error(locale === 'ko' ? 'GitHub API를 불러오지 못했습니다.' : 'GitHub API unavailable.')
        }
        if (!githubConnected) {
          throw new Error(locale === 'ko' ? 'GitHub에 먼저 로그인해 주세요.' : 'Please sign in with GitHub first.')
        }
        const owner = (githubLogin || '').trim()
        if (!owner) {
          throw new Error(locale === 'ko' ? 'GitHub 계정 정보를 불러오지 못했습니다. 다시 로그인해 주세요.' : 'Unable to determine GitHub account. Please sign in again.')
        }
        const created = await api.github.repoCreate({
          owner,
          name: repoName,
          visibility: 'public',
          ...(createDescription.trim() ? { description: createDescription.trim() } : {})
        })
        remoteUrl = created.cloneUrl
      }

      const config: WorkspaceConfig = {
        authProvider: 'github' as const,
        locale,
        workspaceType: 'creator' as const,
        siteProjectKind: siteProjectKind === 'showcase' ? 'column' : siteProjectKind,
        templateId: 'blog',
        title: createTitle.trim() || repoName,
        description: createDescription.trim(),
        themeColor: '#f97316',
        layoutStyle: 'editorial' as const,
        localDirectory,
        repository: {
          mode: 'create' as const,
          providerId: 'github' as const,
          repositoryName: repoName,
          ...(remoteUrl ? { remoteUrl } : {})
        }
      }

      const result = await api.workspace.initialize(config)

      const id =
        result.manifest.name ||
        (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()))

      await api.catalog.add({
        id,
        title: result.manifest.title,
        localDirectory: result.workspaceRoot,
        ...(remoteUrl ? { remoteUrl } : {}),
        createdAt: now,
        updatedAt: now
      })

      if (syncAfterCreate && remoteUrl && api.git?.initialSync) {
        await api.git.initialSync({ directory: result.workspaceRoot, remoteUrl, branch: 'main' })
      }

      const next = await api.catalog.list()
      setWorkspaces(next)

      enterWorkspace({
        workspaceId: id,
        workspaceConfig: config,
        workspaceResult: result
      })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      if (message.includes('Repository name already exists')) {
        const suffix = String(new Date().toISOString().slice(0, 10)).replace(/-/g, '')
        const nextName = `${repoName}-${suffix}`
        setSuggestedRepoName(nextName)
        setError(
          locale === 'ko'
            ? '같은 이름의 GitHub 레포가 이미 있습니다. 레포 이름을 바꿔 주세요.'
            : 'A GitHub repository with this name already exists. Please choose a different name.'
        )
      } else if (message.includes('Select an empty directory') || message.includes('비어 있는 디렉터리')) {
        setError(
          locale === 'ko'
            ? `앤솔로지는 비어 있는 폴더에만 만들 수 있습니다. "${localDirectory}"에 이미 파일이 있습니다. 그 폴더를 삭제하거나 비운 뒤 다시 시도하거나, 제목을 바꿔 다른 폴더 이름을 쓰세요.`
            : `New anthologies need an empty folder. "${localDirectory}" already has files. Delete or empty that folder and try again, or change the anthology title to use a different folder name.`
        )
      } else {
        setError(message || (locale === 'ko' ? '앤솔로지 생성에 실패했습니다.' : 'Failed to create anthology.'))
      }
    } finally {
      setCreating(false)
    }
  }

  async function confirmRemoveWorkspace() {
    if (!removeConfirmWorkspace || !window.emprint?.catalog?.remove || !window.emprint?.catalog?.list) return
    setRemoveConfirmBusy(true)
    setError(null)
    try {
      const ghRepo = parseGithubRepoFromRemoteUrl(removeConfirmWorkspace.remoteUrl ?? '')
      const deleteRemote = removeConfirmAlsoRemote && !!ghRepo
      await window.emprint.catalog.remove({
        id: removeConfirmWorkspace.id,
        deleteRemote
      })
      const next = await window.emprint.catalog.list()
      setWorkspaces(next)
      setRemoveConfirmWorkspace(null)
      setRemoveConfirmAlsoRemote(false)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : locale === 'ko'
            ? '앤솔로지를 제거하지 못했습니다.'
            : 'Could not remove the anthology.'
      )
    } finally {
      setRemoveConfirmBusy(false)
    }
  }

  const removeModalGithubRepo = removeConfirmWorkspace
    ? parseGithubRepoFromRemoteUrl(removeConfirmWorkspace.remoteUrl ?? '')
    : null

  return (
    <div className="h-full bg-base text-ink">
      <div className="grid h-full grid-cols-1 bg-base lg:grid-cols-[232px_minmax(0,1fr)]">
        <Sidebar
          mode="hub"
          locale={locale}
          {...(workspaceRootDir ? { workspaceRootDir } : {})}
          {...(typeof githubConnected === 'boolean' ? { githubConnected } : {})}
          {...(githubLogin ? { githubLogin } : {})}
        >
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full justify-center gap-2 px-2"
              aria-label={locale === 'ko' ? '새 앤솔로지 만들기' : 'Create new anthology'}
              title={locale === 'ko' ? '새 앤솔로지 만들기' : 'Create new anthology'}
              onClick={() => {
                setCreateOpen((v) => !v)
                setError(null)
              }}
            >
              <FolderPlus className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Button>
          </div>
        </Sidebar>

        <main className="min-h-0 overflow-auto bg-base px-6 py-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '목록' : 'List'}</div>
              <div className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                {locale === 'ko' ? '앤솔로지' : 'Anthologies'}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-danger/55 bg-dangerBg px-3 py-2.5 text-sm text-dangerInk">
              {error}
              {suggestedRepoName ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label={`Use suggested name ${suggestedRepoName}`}
                    title={
                      locale === 'ko'
                        ? `이름 바꾸기: ${suggestedRepoName}`
                        : `Use suggested name: ${suggestedRepoName}`
                    }
                    onClick={() => {
                      // apply suggestion by updating the title (single source of truth)
                      setCreateTitle(suggestedRepoName)
                      setSuggestedRepoName(null)
                      setError(null)
                    }}
                  >
                    <Sparkles className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {createOpen ? (
            <Card className="mb-4 w-full space-y-5 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
                    {locale === 'ko' ? '새 앤솔로지' : 'New anthology'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label={locale === 'ko' ? '닫기' : 'Close'}
                    title={locale === 'ko' ? '닫기' : 'Close'}
                    onClick={() => {
                      setCreateOpen(false)
                      setError(null)
                    }}
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {locale === 'ko' ? '사이트 형식' : 'Site format'}
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSiteProjectKind('column')}
                    aria-pressed={siteProjectKind === 'column'}
                    className={cn(
                      'titlebar-nodrag relative flex w-full min-w-0 flex-col gap-3 rounded-xl border bg-panel p-4 text-left transition-shadow',
                      'hover:border-accent/45 hover:bg-panel2/40',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                      siteProjectKind === 'column'
                        ? 'border-accent shadow-[0_0_0_1px_rgb(var(--accent)/0.45)] ring-2 ring-accent/25'
                        : 'border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
                        siteProjectKind === 'column'
                          ? 'border-accent bg-accent text-[rgb(20_18_14)]'
                          : 'border-muted/35 bg-panel2/30'
                      )}
                      aria-hidden
                    >
                      {siteProjectKind === 'column' ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                    </div>
                    <div className="min-w-0 pr-11">
                      <div className="text-sm font-semibold tracking-tight text-ink">Column</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {locale === 'ko' ? '블로그 형식 · 글 중심' : 'Blog-style · writing-first'}
                      </div>
                    </div>
                    <BlogLayoutPreview />
                    <p className="text-[11px] leading-relaxed text-muted">
                      {locale === 'ko'
                        ? 'posts/에서 Markdown으로 글을 쓰고, 방문자에게는 최신 글부터 이어 읽히는 전형적인 블로그 사이트입니다.'
                        : 'Write in Markdown under posts/; visitors read newest entries first—classic blog flow.'}
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className={cn(
                      'titlebar-nodrag relative flex w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-panel p-4 text-left',
                      'cursor-not-allowed opacity-[0.58]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border/80'
                    )}
                    title={
                      locale === 'ko'
                        ? '쇼케이스 형식은 아직 준비 중입니다. 지금은 Column만 선택할 수 있습니다.'
                        : 'Showcase is not available yet. Use Column for now.'
                    }
                  >
                    <div
                      className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted/25 bg-panel2/20"
                      aria-hidden
                    />
                    <div className="min-w-0 pr-11">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold tracking-tight text-ink">Showcase</div>
                        <Badge className="text-[10px] font-normal uppercase tracking-wide">
                          {locale === 'ko' ? '준비 중' : 'Soon'}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {locale === 'ko' ? '포트폴리오 형식 · 작업물 그리드' : 'Portfolio-style · project grid'}
                      </div>
                    </div>
                    <PortfolioLayoutPreview />
                    <p className="text-[11px] leading-relaxed text-muted">
                      {locale === 'ko'
                        ? '대표 작업을 카드로 모아 보여 주는 형식은 추후 제공될 예정입니다.'
                        : 'A project-card layout is planned for a later release.'}
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '제목' : 'Title'}</div>
                  <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder={locale === 'ko' ? '예: 나의 글쓰기' : 'e.g. My writing'} />
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '저장 위치' : 'Location'}</div>
                  <div className="rounded-md border border-border bg-panel px-3 py-2.5 font-mono text-[11px] text-muted">
                    {workspaceRootDir
                      ? `${workspaceRootDir.replace(/\/+$/g, '')}/${slugifyRepoName(createTitle)}`
                      : locale === 'ko'
                        ? '루트를 먼저 선택해 주세요.'
                        : 'Select a root folder first.'}
                  </div>
                  <div className="text-[11px] text-muted">
                    {locale === 'ko'
                      ? '제목을 기반으로 폴더/원격 이름을 자동으로 만듭니다.'
                      : 'Folder and remote name are derived from the title.'}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
                  {locale === 'ko' ? '설명 (필수)' : 'Description (required)'}
                </div>
                <Textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={locale === 'ko' ? '한 줄로 이 앤솔로지를 설명해 주세요.' : 'Describe this anthology in one line.'}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? 'GitHub 주소' : 'GitHub URL'}</div>
                    <div className="text-[11px] text-muted">
                      {locale === 'ko'
                        ? 'GitHub에 앤솔로지를 자동으로 만들거나(추천), 이미 만든 GitHub URL을 붙여넣을 수 있습니다.'
                        : 'You can auto-create an anthology on GitHub (recommended) or paste an existing GitHub URL.'}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label={locale === 'ko' ? 'GitHub에서 새 앤솔로지 만들기' : 'Create anthology on GitHub (web)'}
                    title={locale === 'ko' ? 'GitHub에서 만들기' : 'Create on GitHub'}
                    onClick={() => {
                      window.open('https://github.com/new', '_blank')
                    }}
                  >
                    <ExternalLink className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2">
                    <label className="titlebar-nodrag flex w-full cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-panel px-3 py-2.5">
                      <div className="min-w-0 flex-1 text-sm text-ink">
                        {locale === 'ko' ? 'GitHub에도 만들기' : 'Create on GitHub'}
                      </div>
                      <input
                        type="checkbox"
                        checked={createOnGithub}
                        onChange={(e) => setCreateOnGithub(e.target.checked)}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                      />
                    </label>

                    {createOnGithub ? (
                      <label className="titlebar-nodrag flex w-full cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-panel px-3 py-2.5">
                        <div className="min-w-0 flex-1 text-sm text-ink">{locale === 'ko' ? '초기 푸시' : 'Initial push'}</div>
                        <input
                          type="checkbox"
                          checked={syncAfterCreate}
                          onChange={(e) => setSyncAfterCreate(e.target.checked)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                        />
                      </label>
                    ) : (
                      <div className="w-full">
                        <Input
                          value={createRemoteUrl}
                          onChange={(e) => setCreateRemoteUrl(e.target.value)}
                          placeholder="https://github.com/<owner>/<repo>.git"
                        />
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-muted">
                    {createOnGithub
                      ? locale === 'ko'
                        ? 'GitHub에 생성하고 자동으로 연결합니다. 초기 푸시는 posts/, src/ 등 전체 앤솔로지를 첫 커밋 후 push합니다.'
                        : 'Auto-create on GitHub and wire origin. Initial push commits everything (posts/, src/, etc.) then pushes.'
                      : locale === 'ko'
                        ? 'GitHub에서 직접 만든 앤솔로지의 URL을 붙여넣습니다.'
                        : 'Paste the URL of an existing GitHub anthology.'}
                  </div>
                  {createOnGithub ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-[11px] leading-snug text-muted">
                      {locale === 'ko'
                        ? 'GitHub Pages 무료 플랜 기준 공개 저장소(public)로 생성됩니다. drafts/ 디렉토리는 자동으로 .gitignore에 포함되어 공개되지 않습니다.'
                        : 'Created as a public repository (required by GitHub Pages free plan). The drafts/ directory is auto-ignored, so private drafts stay local.'}
                    </div>
                  ) : null}
                </div>

                <div className="hidden" />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <div className="text-[11px] text-muted">
                  {githubConnected
                    ? locale === 'ko'
                      ? 'GitHub 연결됨 (현재는 토큰/자동 생성은 준비 중)'
                      : 'GitHub connected'
                    : locale === 'ko'
                      ? 'GitHub 미연결 (레포 자동 생성은 로그인 후 가능)'
                      : 'GitHub not connected (auto creation requires sign-in)'}
                </div>
                <Button
                  type="button"
                  disabled={creating}
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label={locale === 'ko' ? '앤솔로지 생성' : 'Create anthology'}
                  title={locale === 'ko' ? '생성' : 'Create'}
                  onClick={() => void createNewWorkspace()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" strokeWidth={2} />
                  )}
                </Button>
              </div>
            </Card>
          ) : null}

          {loading ? (
            <Card className="px-4 py-6 text-sm text-muted">{locale === 'ko' ? '불러오는 중…' : 'Loading…'}</Card>
          ) : sorted.length === 0 ? (
            <Card className="px-4 py-10 text-center text-sm text-muted">
              {locale === 'ko' ? '아직 등록된 앤솔로지가 없습니다.' : 'No anthologies registered yet.'}
            </Card>
          ) : (
            <div className="grid gap-3">
              {sorted.map((workspace) => {
                const pagesUrl = resolveGithubPagesUrl(workspace, githubLogin)
                return (
                <Card key={workspace.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{workspace.title}</div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted">{workspace.localDirectory}</div>
                    </div>
                    <div className="text-[11px] text-muted">{formatDate(workspace.updatedAt)}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        className="h-8 w-8 shrink-0 p-0"
                        aria-label={locale === 'ko' ? '앤솔로지 열기' : 'Open anthology'}
                        title={locale === 'ko' ? '열기' : 'Open'}
                        onClick={() => void openWorkspace(workspace.localDirectory, workspace.id)}
                      >
                        <FolderOpen className="h-4 w-4" strokeWidth={2} />
                      </Button>
                      {pagesUrl ? (
                        <Button
                          variant="outline"
                          type="button"
                          className="h-8 w-8 shrink-0 p-0"
                          aria-label={locale === 'ko' ? '배포된 사이트 열기' : 'Open deployed site'}
                          title={
                            locale === 'ko'
                              ? `배포된 사이트: ${pagesUrl}`
                              : `Deployed site: ${pagesUrl}`
                          }
                          onClick={() => window.open(pagesUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" strokeWidth={2} />
                        </Button>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-8 w-8 shrink-0 p-0"
                      aria-label={locale === 'ko' ? '앤솔로지 제거' : 'Remove anthology'}
                      title={locale === 'ko' ? '제거' : 'Remove'}
                      onClick={() => {
                        setRemoveConfirmWorkspace(workspace)
                        setRemoveConfirmAlsoRemote(false)
                      }}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </Button>
                  </div>
                </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {removeConfirmWorkspace ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-workspace-title"
          className="emprint-scrim titlebar-nodrag fixed inset-0 z-[60] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
          onClick={() => {
            if (!removeConfirmBusy) {
              setRemoveConfirmWorkspace(null)
              setRemoveConfirmAlsoRemote(false)
            }
          }}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <Card className="space-y-4 p-4">
              <div className="text-sm font-semibold text-ink" id="remove-workspace-title">
                {locale === 'ko' ? '앤솔로지 제거' : 'Remove anthology'}
              </div>
              <p className="text-sm text-muted">
                {locale === 'ko'
                  ? '로컬 폴더가 삭제되고 카탈로그에서 제거됩니다. 이 작업은 되돌릴 수 없습니다.'
                  : 'The local folder will be deleted and the entry removed from the catalog. This cannot be undone.'}
              </p>
              <div className="rounded-md border border-border bg-panel px-3 py-2.5">
                <div className="truncate text-sm font-medium text-ink">{removeConfirmWorkspace.title}</div>
                <div className="mt-1 break-all font-mono text-[11px] text-muted">{removeConfirmWorkspace.localDirectory}</div>
              </div>
              {removeModalGithubRepo ? (
                <label className="titlebar-nodrag flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-panel2/40 px-3 py-2.5">
                  <span className="min-w-0 text-xs text-muted">
                    {locale === 'ko'
                      ? `GitHub 저장소 ${removeModalGithubRepo.owner}/${removeModalGithubRepo.repo}도 삭제`
                      : `Also delete GitHub repository ${removeModalGithubRepo.owner}/${removeModalGithubRepo.repo}`}
                  </span>
                  <input
                    type="checkbox"
                    checked={removeConfirmAlsoRemote}
                    onChange={(e) => setRemoveConfirmAlsoRemote(e.target.checked)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={removeConfirmBusy}
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setRemoveConfirmWorkspace(null)
                    setRemoveConfirmAlsoRemote(false)
                  }}
                >
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </Button>
                <Button
                  type="button"
                  disabled={removeConfirmBusy}
                  className="h-8 gap-1.5 px-3 text-xs"
                  onClick={() => void confirmRemoveWorkspace()}
                >
                  {removeConfirmBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
                  ) : null}
                  <span>{locale === 'ko' ? '제거' : 'Remove'}</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}

