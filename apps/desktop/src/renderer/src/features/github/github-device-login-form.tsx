import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Github, Loader2, LogIn, Save } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useAppStore } from '@renderer/state/app-store'

export interface GithubDeviceLoginFormProps {
  /** While a device code is active and login not yet complete, parent can allow “continue anyway” (wizard). */
  onFlowActiveChange?: (active: boolean) => void
  /** Controlled Client ID (e.g. Settings shares with Save row). Omit for internal state (wizard). */
  clientId?: string
  onClientIdChange?: (value: string) => void
  /** When set, persisted with Client ID on sign-in (wizard requires this). */
  clientSecret?: string
  /** Hide Client ID field when parent collects OAuth credentials. */
  hideClientIdField?: boolean
  /** “Create OAuth App” + “Save Client ID” (Emprint Settings). */
  showPersistToolbar?: boolean
  persistSaveBusy?: boolean
  onPersistSave?: () => void | Promise<void>
}

export function GithubDeviceLoginForm({
  onFlowActiveChange,
  clientId: clientIdProp,
  onClientIdChange,
  clientSecret: clientSecretProp,
  hideClientIdField,
  showPersistToolbar,
  persistSaveBusy,
  onPersistSave
}: GithubDeviceLoginFormProps) {
  const locale = useAppStore((state) => state.locale)
  const setGithubSession = useAppStore((state) => state.setGithubSession)

  const [internalClientId, setInternalClientId] = useState('')
  const isControlled = clientIdProp !== undefined && onClientIdChange !== undefined
  const clientId = isControlled ? clientIdProp : internalClientId
  const setClientId = isControlled ? onClientIdChange! : setInternalClientId

  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authPolling, setAuthPolling] = useState(false)
  const [clientIdSaved, setClientIdSaved] = useState(false)
  const [showClientHelp, setShowClientHelp] = useState(true)
  const [deviceCode, setDeviceCode] = useState<null | {
    userCode: string
    verificationUri: string
    deviceCode: string
    interval: number
    expiresIn: number
  }>(null)

  const pollTimer = useRef<number | null>(null)
  const pollDelayMs = useRef<number>(0)
  const pollStartedAt = useRef<number>(0)

  useEffect(() => {
    if (isControlled) return
    if (!window.emprint?.github?.oauthClientGet) return
    void window.emprint.github
      .oauthClientGet()
      .then((cfg) => {
        if (cfg.clientId) setInternalClientId(cfg.clientId)
      })
      .catch(() => {})
  }, [isControlled])

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        window.clearTimeout(pollTimer.current)
        pollTimer.current = null
      }
    }
  }, [])

  useEffect(() => {
    onFlowActiveChange?.(Boolean(deviceCode))
  }, [deviceCode, onFlowActiveChange])

  async function startGithubLogin() {
    setAuthError(null)
    setAuthLoading(true)
    setAuthPolling(false)
    try {
      const api = window.emprint?.github
      if (!api?.authStart || !api?.oauthClientSet) {
        throw new Error(locale === 'ko' ? 'GitHub 로그인 API를 불러오지 못했습니다.' : 'GitHub auth API unavailable.')
      }
      const trimmedClientId = clientId.trim()
      if (!trimmedClientId) {
        throw new Error(locale === 'ko' ? '먼저 GitHub Client ID를 입력해 주세요.' : 'Please enter a GitHub Client ID first.')
      }

      const trimmedSecret = clientSecretProp?.trim() ?? ''
      const stored = await api.oauthClientGet()
      if (!trimmedSecret && !stored.hasClientSecret) {
        throw new Error(
          locale === 'ko' ? 'Client Secret을 입력·저장한 뒤 로그인해 주세요.' : 'Enter and save the Client Secret before signing in.'
        )
      }

      await api.oauthClientSet({
        clientId: trimmedClientId,
        ...(trimmedSecret ? { clientSecret: trimmedSecret } : {})
      })
      setClientIdSaved(true)
      const code = await api.authStart({ scopes: ['repo', 'workflow', 'delete_repo'] })
      setDeviceCode(code)
      window.open(code.verificationUri, '_blank')

      setAuthLoading(false)
      setAuthPolling(true)

      if (pollTimer.current) {
        window.clearTimeout(pollTimer.current)
        pollTimer.current = null
      }

      pollStartedAt.current = Date.now()
      pollDelayMs.current = Math.max(2, code.interval) * 1000

      const tick = () => {
        const elapsedMs = Date.now() - pollStartedAt.current
        if (elapsedMs > code.expiresIn * 1000) {
          setAuthPolling(false)
          setDeviceCode(null)
          setAuthError(
            locale === 'ko' ? '인증 코드가 만료되었습니다. 다시 시도해 주세요.' : 'Device code expired. Please try again.'
          )
          return
        }

        void api
          .authPoll({ deviceCode: code.deviceCode })
          .then((status) => {
            if (status.connected) {
              setGithubSession({ connected: true, login: status.login })
              setAuthPolling(false)
              setDeviceCode(null)
              return
            }

            pollTimer.current = window.setTimeout(tick, pollDelayMs.current)
          })
          .catch((caught) => {
            const message = caught instanceof Error ? caught.message : 'Sign-in failed.'
            if (message.includes('slow_down')) {
              pollDelayMs.current = Math.min(pollDelayMs.current + 5000, 30000)
              pollTimer.current = window.setTimeout(tick, pollDelayMs.current)
              return
            }

            setAuthLoading(false)
            setAuthPolling(false)
            setAuthError(message)
          })
      }

      pollTimer.current = window.setTimeout(tick, pollDelayMs.current)
    } catch (caught) {
      setAuthLoading(false)
      setAuthPolling(false)
      setAuthError(caught instanceof Error ? caught.message : locale === 'ko' ? '로그인에 실패했습니다.' : 'Sign-in failed.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-panel px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
            {locale === 'ko' ? 'OAuth App 만들기 안내' : 'Create an OAuth App'}
          </div>
          <Button
            variant="ghost"
            type="button"
            className="h-8 w-8 shrink-0 p-0"
            aria-expanded={showClientHelp}
            aria-label={showClientHelp ? (locale === 'ko' ? '안내 접기' : 'Hide OAuth help') : locale === 'ko' ? '안내 펼치기' : 'Show OAuth help'}
            title={showClientHelp ? (locale === 'ko' ? '접기' : 'Hide') : locale === 'ko' ? '펴기' : 'Show'}
            onClick={() => setShowClientHelp((v) => !v)}
          >
            {showClientHelp ? <ChevronUp className="h-4 w-4" strokeWidth={2} /> : <ChevronDown className="h-4 w-4" strokeWidth={2} />}
          </Button>
        </div>
        {showClientHelp ? (
          <div className="mt-2 space-y-2 text-[12px] text-muted">
            <div>
              {locale === 'ko'
                ? 'Emprint는 오픈소스 배포를 전제로, “공식 앱” 대신 사용자가 자신의 GitHub OAuth App Client ID를 넣어 사용합니다.'
                : 'For open-source distribution, Emprint uses a user-provided GitHub OAuth App Client ID instead of a shared “official app”.'}
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '필수' : 'Required'}</div>
              <div>- {locale === 'ko' ? 'GitHub에서 “OAuth Apps” → “New OAuth App”' : 'GitHub “OAuth Apps” → “New OAuth App”'}</div>
              <div>- {locale === 'ko' ? '“Enable Device Flow” 체크' : 'Check “Enable Device Flow”'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '권장 입력값' : 'Suggested values'}</div>
              <div className="rounded-md border border-border/70 bg-surface px-2 py-2 font-mono text-[11px] text-ink">
                <div>Application name: Emprint (local)</div>
                <div>Homepage URL: https://github.com</div>
                <div>Authorization callback URL: https://example.com</div>
              </div>
              <div>
                {locale === 'ko'
                  ? 'Device Flow는 콜백 URL을 실제로 사용하지 않습니다. GitHub 설정 UI가 요구해서 아무 URL이나 넣어도 됩니다.'
                  : 'Device Flow does not actually use the callback URL. GitHub requires it in the form, so any valid URL works.'}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                type="button"
                className="h-8 w-8 shrink-0 p-0"
                aria-label={locale === 'ko' ? 'GitHub New OAuth App 열기' : 'Open GitHub New OAuth App'}
                title={locale === 'ko' ? 'New OAuth App 열기' : 'Open “New OAuth App”'}
                onClick={() => window.open('https://github.com/settings/applications/new', '_blank')}
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                type="button"
                className="h-8 w-8 shrink-0 p-0"
                aria-label={locale === 'ko' ? 'Device Flow 문서' : 'Device Flow documentation'}
                title={locale === 'ko' ? 'Device Flow 문서' : 'Device Flow docs'}
                onClick={() =>
                  window.open(
                    'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow',
                    '_blank'
                  )
                }
              >
                <BookOpen className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {hideClientIdField ? null : (
      <div className="space-y-2 rounded-md border border-border bg-panel px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">OAuth Client ID</div>
          <Button
            variant="ghost"
            type="button"
            className="h-8 w-8 shrink-0 p-0"
            aria-label={locale === 'ko' ? 'GitHub 개발자 설정 열기' : 'Open GitHub developer settings'}
            title={locale === 'ko' ? 'GitHub에서 만들기' : 'Create on GitHub'}
            onClick={() => window.open('https://github.com/settings/developers', '_blank')}
          >
            <Github className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>
        <Input
          value={clientId}
          onChange={(e) => {
            setClientIdSaved(false)
            setClientId(e.target.value)
          }}
          placeholder={locale === 'ko' ? '예: Iv1.XXXXXXXXXXXX' : 'e.g. Iv1.XXXXXXXXXXXX'}
        />
        <div className="text-[11px] text-muted">
          {locale === 'ko'
            ? '오픈소스 배포를 위해, 이 앱은 사용자별 Client ID를 저장해 사용합니다.'
            : 'For open-source distribution, the app stores a user-provided Client ID.'}
          {clientIdSaved ? (locale === 'ko' ? ' (저장됨)' : ' (saved)') : null}
        </div>
        {showPersistToolbar ? (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              type="button"
              className="h-8 w-8 shrink-0 p-0"
              aria-label={locale === 'ko' ? 'GitHub에서 OAuth App 만들기' : 'Create OAuth App on GitHub'}
              title={locale === 'ko' ? 'New OAuth App' : 'Create OAuth App'}
              onClick={() => window.open('https://github.com/settings/applications/new', '_blank')}
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
            </Button>
            <Button
              type="button"
              disabled={persistSaveBusy}
              className="h-8 w-8 shrink-0 p-0"
              aria-label={locale === 'ko' ? 'Client ID 저장' : 'Save OAuth Client ID'}
              title={locale === 'ko' ? '저장' : 'Save'}
              onClick={() => void onPersistSave?.()}
            >
              {persistSaveBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              ) : (
                <Save className="h-4 w-4" strokeWidth={2} />
              )}
            </Button>
          </div>
        ) : null}
      </div>
      )}

      {authError ? (
        <div className="rounded-md border border-danger/55 bg-dangerBg px-3 py-2.5 text-sm text-dangerInk">{authError}</div>
      ) : null}

      {deviceCode ? (
        <div className="space-y-2 rounded-md border border-border bg-panel px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{locale === 'ko' ? '인증 코드' : 'User code'}</div>
          <div className="font-mono text-[18px] font-semibold tracking-[0.18em] text-ink">{deviceCode.userCode}</div>
          <div className="text-[11px] text-muted">{deviceCode.verificationUri}</div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={authLoading}
          className="h-8 gap-1.5 px-3"
          aria-label={locale === 'ko' ? 'GitHub로 로그인' : 'Sign in with GitHub'}
          title={locale === 'ko' ? 'GitHub로 로그인' : 'Sign in with GitHub'}
          onClick={() => void startGithubLogin()}
        >
          {authLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
          ) : (
            <LogIn className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          )}
          <span className="text-xs">{locale === 'ko' ? 'GitHub로 로그인' : 'Sign in with GitHub'}</span>
        </Button>
        {deviceCode ? (
          <div className="text-[12px] text-muted">
            {authPolling
              ? locale === 'ko'
                ? '승인 대기 중…'
                : 'Waiting for approval…'
              : locale === 'ko'
                ? '브라우저에서 승인해 주세요.'
                : 'Approve in your browser.'}
          </div>
        ) : null}
      </div>
    </div>
  )
}
