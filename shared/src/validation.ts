import type {
  AppLocale,
  GitRemoteProviderId,
  RepositorySetupMode,
  SiteProjectKind,
  WorkspaceConfig,
  WorkspaceLayoutStyle,
  WorkspaceType,
  WorkspaceTemplateId
} from './types'

const locales = new Set<AppLocale>(['ko', 'en'])
const workspaceTypes = new Set<WorkspaceType>(['creator', 'developer', 'ai'])
/**
 * Legacy template ids ('minimal-blog', 'dev-blog', 'portfolio-blog') are
 * accepted for backwards compatibility with existing workspace manifests and
 * normalized to the current single template id 'blog'.
 */
const knownTemplateIdStrings = new Set<string>([
  'blog',
  'minimal-blog',
  'dev-blog',
  'portfolio-blog'
])
const siteProjectKinds = new Set<SiteProjectKind>(['column', 'memoir'])
const layoutStyles = new Set<WorkspaceLayoutStyle>(['editorial', 'notebook', 'magazine'])
const providerIds = new Set<GitRemoteProviderId>([
  'github',
  'gitlab',
  'gitea',
  'bitbucket',
  'self-hosted'
])
const repositoryModes = new Set<RepositorySetupMode>(['create', 'clone'])

export function parseWorkspaceConfig(input: unknown): WorkspaceConfig {
  const record = asRecord(input, 'workspace config', 'ko')
  const locale = asAppLocale(record.locale)
  const repository = asRecord(record.repository, 'workspace repository', locale)

  const config: WorkspaceConfig = {
    authProvider: asGitHubAuthProvider(record.authProvider, locale),
    locale,
    workspaceType: asWorkspaceType(record.workspaceType, locale),
    siteProjectKind: parseSiteProjectKind(record.siteProjectKind, locale),
    templateId: asWorkspaceTemplateId(record.templateId, locale),
    title: asNonEmptyString(record.title, 'title', locale),
    description: asNonEmptyString(record.description, 'description', locale),
    themeColor: asNonEmptyString(record.themeColor, 'themeColor', locale),
    layoutStyle: asWorkspaceLayoutStyle(record.layoutStyle, locale),
    localDirectory: asNonEmptyString(record.localDirectory, 'localDirectory', locale),
    repository: {
      mode: asRepositoryMode(repository.mode, locale),
      providerId: asGitRemoteProviderId(repository.providerId, locale)
    }
  }

  if (typeof repository.remoteUrl === 'string' && repository.remoteUrl.trim()) {
    config.repository.remoteUrl = repository.remoteUrl.trim()
  }

  if (typeof repository.repositoryName === 'string' && repository.repositoryName.trim()) {
    config.repository.repositoryName = repository.repositoryName.trim()
  }

  if (typeof repository.defaultBranch === 'string' && repository.defaultBranch.trim()) {
    config.repository.defaultBranch = repository.defaultBranch.trim()
  }

  if (config.repository.mode === 'clone' && !config.repository.remoteUrl) {
    throw new Error(locale === 'ko'
      ? '저장소 모드가 "clone"일 때는 원격 저장소 주소가 필요합니다.'
      : 'A remote URL is required when repository mode is "clone".')
  }

  return config
}

function asRecord(value: unknown, label: string, locale: AppLocale): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      locale === 'ko'
        ? `${translateLabel(label, locale)} 형식이 올바르지 않습니다.`
        : `Invalid ${label}.`
    )
  }

  return value as Record<string, unknown>
}

function asNonEmptyString(value: unknown, label: string, locale: AppLocale): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      locale === 'ko'
        ? `${translateLabel(label, locale)} 값이 비어 있거나 올바르지 않습니다.`
        : `Invalid ${label}.`
    )
  }

  return value.trim()
}

function asGitHubAuthProvider(value: unknown, locale: AppLocale): 'github' {
  if (value !== 'github') {
    throw new Error(locale === 'ko' ? '지원하지 않는 인증 제공자입니다.' : 'Unsupported authProvider.')
  }

  return value
}

function asAppLocale(value: unknown): AppLocale {
  if (typeof value !== 'string' || !locales.has(value as AppLocale)) {
    return 'ko'
  }

  return value as AppLocale
}

function asWorkspaceType(value: unknown, locale: AppLocale): WorkspaceType {
  if (typeof value !== 'string' || !workspaceTypes.has(value as WorkspaceType)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 워크스페이스 유형입니다.' : 'Unsupported workspaceType.')
  }

  return value as WorkspaceType
}

function asWorkspaceTemplateId(value: unknown, locale: AppLocale): WorkspaceTemplateId {
  if (typeof value !== 'string' || !knownTemplateIdStrings.has(value)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 템플릿입니다.' : 'Unsupported templateId.')
  }

  return 'blog'
}

function parseSiteProjectKind(value: unknown, locale: AppLocale): SiteProjectKind {
  if (value === undefined || value === null || value === '') {
    return 'column'
  }
  if (typeof value !== 'string' || !siteProjectKinds.has(value as SiteProjectKind)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 사이트 유형입니다.' : 'Unsupported siteProjectKind.')
  }

  return value as SiteProjectKind
}

function asWorkspaceLayoutStyle(value: unknown, locale: AppLocale): WorkspaceLayoutStyle {
  if (typeof value !== 'string' || !layoutStyles.has(value as WorkspaceLayoutStyle)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 레이아웃입니다.' : 'Unsupported layoutStyle.')
  }

  return value as WorkspaceLayoutStyle
}

function asGitRemoteProviderId(value: unknown, locale: AppLocale): GitRemoteProviderId {
  if (typeof value !== 'string' || !providerIds.has(value as GitRemoteProviderId)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 저장소 제공자입니다.' : 'Unsupported repository provider.')
  }

  return value as GitRemoteProviderId
}

function asRepositoryMode(value: unknown, locale: AppLocale): RepositorySetupMode {
  if (typeof value !== 'string' || !repositoryModes.has(value as RepositorySetupMode)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 저장소 모드입니다.' : 'Unsupported repository mode.')
  }

  return value as RepositorySetupMode
}

function translateLabel(label: string, locale: AppLocale): string {
  if (locale !== 'ko') {
    return label
  }

  const labels: Record<string, string> = {
    'workspace config': '워크스페이스 설정',
    'workspace repository': '워크스페이스 저장소 설정',
    title: '제목',
    description: '설명',
    themeColor: '테마 색상',
    localDirectory: '로컬 디렉터리'
  }

  return labels[label] ?? label
}
