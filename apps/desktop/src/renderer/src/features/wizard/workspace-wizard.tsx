import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FolderOpen,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardDescription, CardTitle } from '@renderer/components/ui/card'
import { GithubDeviceLoginForm } from '@renderer/features/github/github-device-login-form'
import { Sidebar } from '@renderer/features/shell/sidebar'
import { useAppStore } from '@renderer/state/app-store'

type WizardStep = 'git' | 'github' | 'root'

const steps: WizardStep[] = ['git', 'github', 'root']

export function WorkspaceWizard() {
  const locale = useAppStore((state) => state.locale)
  const completeWizard = useAppStore((state) => state.completeWizard)
  const githubConnected = useAppStore((state) => state.githubConnected)
  const githubLogin = useAppStore((state) => state.githubLogin)
  const setGithubSession = useAppStore((state) => state.setGithubSession)
  const runtimeInfo = useAppStore((state) => state.runtimeInfo)
  const workspaceRootDir = useAppStore((state) => state.workspaceRootDir)

  const [stepIndex, setStepIndex] = useState(0)
  const [gitReady, setGitReady] = useState(false)
  const [gitStatus, setGitStatus] = useState<null | { state: string; message?: string; error?: string }>(null)
  const [githubFlowPending, setGithubFlowPending] = useState(false)
  const [rootDir, setRootDir] = useState(workspaceRootDir ?? '')

  const atLast = stepIndex === steps.length - 1
  const currentStep = steps[stepIndex]!

  const canContinue =
    currentStep === 'git'
      ? gitReady
      : currentStep === 'github'
        ? githubConnected || githubFlowPending
        : Boolean(rootDir.trim())

  async function selectRoot() {
    const result = await window.emprint.system.selectDirectory()
    if (result?.directory) {
      setRootDir(result.directory)
    }
  }

  useEffect(() => {
    if (currentStep !== 'git') return
    if (!window.emprint?.git?.detect) return

    let alive = true
    setGitStatus({ state: 'checking' })
    void window.emprint.git
      .detect()
      .then((detected) => {
        if (!alive) return
        if (detected.available) {
          setGitReady(true)
          setGitStatus({ state: 'ready', message: `git ${detected.version ?? ''}`.trim() })
        } else {
          setGitReady(false)
          setGitStatus({ state: 'missing', message: 'Git is not available yet.' })
        }
      })
      .catch((caught) => {
        if (!alive) return
        setGitReady(false)
        setGitStatus({ state: 'error', error: caught instanceof Error ? caught.message : 'Failed to detect git.' })
      })

    return () => {
      alive = false
    }
  }, [currentStep])

  const platform = runtimeInfo?.platform || ''
  const installCommands =
    platform === 'win32'
      ? ['winget install --id Git.Git -e', '# or', 'choco install git -y']
      : platform === 'darwin'
        ? ['xcode-select --install', '# or (Homebrew)', 'brew install git']
        : ['sudo apt-get update && sudo apt-get install -y git', '# or (Fedora)', 'sudo dnf install -y git', '# or (Arch)', 'sudo pacman -S git']

  useEffect(() => {
    if (!window.emprint?.github?.authStatus) return
    void window.emprint.github
      .authStatus()
      .then((status) => {
        if (status.connected) {
          setGithubSession({ connected: true, login: status.login })
        }
      })
      .catch(() => {})
  }, [setGithubSession])

  function finish() {
    completeWizard({
      workspaceRootDir: rootDir.trim(),
      githubConnected: githubConnected
    })
  }

  const stepLabel =
    currentStep === 'git'
      ? locale === 'ko'
        ? 'Git 준비'
        : 'Git'
      : currentStep === 'github'
        ? locale === 'ko'
          ? 'GitHub 로그인'
          : 'GitHub'
        : locale === 'ko'
          ? '루트 폴더'
          : 'Root folder'

  return (
    <div className="h-full bg-base text-ink">
      <div className="grid h-full grid-cols-1 bg-base lg:grid-cols-[232px_minmax(0,1fr)]">
        <Sidebar
          mode="hub"
          locale={locale}
          {...(rootDir.trim() ? { workspaceRootDir: rootDir.trim() } : {})}
          {...(typeof githubConnected === 'boolean' ? { githubConnected } : {})}
          {...(githubLogin ? { githubLogin } : {})}
        >
          <div className="space-y-2">
            {steps.map((id, idx) => (
              <div
                key={id}
                className={[
                  'rounded-md border px-3 py-2.5 transition',
                  idx === stepIndex ? 'border-accent/45 bg-panel2' : idx < stepIndex ? 'border-border bg-surface' : 'border-border/70 bg-panel'
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
                      {locale === 'ko' ? `단계 ${idx + 1}` : `Step ${idx + 1}`}
                    </div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {id === 'git'
                        ? locale === 'ko'
                          ? 'Git 준비'
                          : 'Git'
                        : id === 'github'
                          ? locale === 'ko'
                            ? 'GitHub 로그인'
                            : 'GitHub'
                          : locale === 'ko'
                            ? '루트 폴더 선택'
                            : 'Root folder'}
                    </div>
                  </div>
                  <div
                    className={
                      idx === stepIndex
                        ? 'h-2 w-2 rounded-full bg-accent'
                        : idx < stepIndex
                          ? 'h-2 w-2 rounded-full bg-muted'
                          : 'h-2 w-2 rounded-full bg-border'
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </Sidebar>

        <div className="grid min-h-0 grid-rows-[52px_minmax(0,1fr)] bg-base">
          <header className="flex items-center justify-between border-b border-border px-6">
            <div className="flex items-center gap-3">
              <Badge>{stepLabel}</Badge>
              <div className="text-sm text-muted">{locale === 'ko' ? `${stepIndex + 1} / ${steps.length} 단계` : `Step ${stepIndex + 1} of ${steps.length}`}</div>
            </div>
          </header>

          <div className="min-h-0 overflow-auto bg-panel px-6 py-6">
            {currentStep === 'git' ? (
              <Card className="space-y-4">
                <CardTitle>{locale === 'ko' ? 'Git 준비' : 'Git ready'}</CardTitle>
                <CardDescription>
                  {locale === 'ko'
                    ? 'Git이 설치되어 있어야 배포(커밋/푸시)를 할 수 있습니다. 현재 단계는 UI만 준비되어 있습니다.'
                    : 'Git must be available to commit/push.'}
                </CardDescription>
                {gitStatus?.error ? (
                  <div className="rounded-md border border-danger/55 bg-dangerBg px-3 py-2.5 text-sm text-dangerInk">
                    {gitStatus.error}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Badge>
                    {gitReady ? 'Ready' : gitStatus?.state === 'checking' ? 'Checking…' : 'Not ready'}
                  </Badge>
                  {gitStatus?.message ? <div className="text-sm text-muted">{gitStatus.message}</div> : null}
                </div>

                {!gitReady ? (
                  <div className="rounded-md border border-border/70 bg-surface px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Install commands</div>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-ink">{installCommands.join('\n')}</pre>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label="Retry Git detection"
                    title="Retry"
                    onClick={() => {
                      // re-run detect with UI feedback
                      setGitReady(false)
                      setGitStatus({ state: 'checking' })
                      void window.emprint.git.detect().then((detected) => {
                        if (detected.available) {
                          setGitReady(true)
                          setGitStatus({ state: 'ready', message: `git ${detected.version ?? ''}`.trim() })
                        } else {
                          setGitReady(false)
                          setGitStatus({ state: 'missing', message: 'Git is not available yet.' })
                        }
                      })
                    }}
                  >
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                  </Button>
                </div>
              </Card>
            ) : null}

            {currentStep === 'github' ? (
              <Card className="space-y-4">
                <CardTitle>{locale === 'ko' ? 'GitHub 로그인' : 'Sign in with GitHub'}</CardTitle>
                <CardDescription>
                  {locale === 'ko'
                    ? 'GitHub Device Flow로 로그인합니다. 브라우저에서 승인하면 앱이 자동으로 연결됩니다.'
                    : 'Sign in with GitHub using Device Flow. Approve in your browser and the app will connect automatically.'}
                </CardDescription>
                {githubConnected ? (
                  <Badge>{githubLogin ? (locale === 'ko' ? `연결됨: ${githubLogin}` : `Connected: ${githubLogin}`) : locale === 'ko' ? '연결됨' : 'Connected'}</Badge>
                ) : (
                  <GithubDeviceLoginForm onFlowActiveChange={setGithubFlowPending} />
                )}
              </Card>
            ) : null}

            {currentStep === 'root' ? (
              <Card className="space-y-4">
                <CardTitle>{locale === 'ko' ? '워크스페이스 루트 폴더' : 'Workspace root folder'}</CardTitle>
                <CardDescription>
                  {locale === 'ko'
                    ? '워크스페이스(여러 레포)를 보관할 기본 루트 폴더를 선택합니다.'
                    : 'Choose a root folder to store or organize workspaces.'}
                </CardDescription>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    className="h-8 w-8 shrink-0 p-0"
                    aria-label={locale === 'ko' ? '폴더 선택' : 'Select folder'}
                    title={locale === 'ko' ? '폴더 선택' : 'Select folder'}
                    onClick={selectRoot}
                  >
                    <FolderOpen className="h-4 w-4" strokeWidth={2} />
                  </Button>
                  <div className="min-w-0 truncate font-mono text-[11px] text-muted">
                    {rootDir || (locale === 'ko' ? '선택되지 않음' : 'Not selected')}
                  </div>
                </div>
              </Card>
            ) : null}

            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="ghost"
                type="button"
                className="h-8 w-8 shrink-0 p-0"
                disabled={stepIndex === 0}
                aria-label={locale === 'ko' ? '이전' : 'Back'}
                title={locale === 'ko' ? '이전' : 'Back'}
                onClick={() => setStepIndex((v) => Math.max(0, v - 1))}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2} />
              </Button>
              {!atLast ? (
                <Button
                  type="button"
                  disabled={!canContinue}
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label={locale === 'ko' ? '다음' : 'Continue'}
                  title={locale === 'ko' ? '다음' : 'Continue'}
                  onClick={() => setStepIndex((v) => Math.min(steps.length - 1, v + 1))}
                >
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!canContinue}
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label={locale === 'ko' ? '완료' : 'Finish'}
                  title={locale === 'ko' ? '완료' : 'Finish'}
                  onClick={finish}
                >
                  <Check className="h-4 w-4" strokeWidth={2} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
