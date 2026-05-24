import type {
  AppLocale,
  GitRemoteProviderId,
  RepositorySetupMode,
  SiteProjectKind,
  WorkspaceConfig,
  WorkspaceLayoutStyle,
  WorkspaceManifest,
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
const siteProjectKinds = new Set<SiteProjectKind>(['column', 'memoir', 'dictionary'])
const layoutStyles = new Set<WorkspaceLayoutStyle>(['editorial', 'notebook', 'magazine'])
const providerIds = new Set<GitRemoteProviderId>([
  'github',
  'gitlab',
  'gitea',
  'bitbucket',
  'self-hosted'
])
const repositoryModes = new Set<RepositorySetupMode>(['create', 'clone'])

/** Lenient parse for on-disk `.workspace/manifest.json` (catalog reconcile, open). */
export function parseWorkspaceManifest(input: unknown): WorkspaceManifest | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const record = input as Record<string, unknown>

  const name = parseNonEmptyString(record.name)
  const title = parseNonEmptyString(record.title)
  const description = parseNonEmptyString(record.description)
  if (!name || !title || !description) return null

  const locale = coerceAppLocale(record.locale)
  const workspaceType = parseWorkspaceType(record.workspaceType)
  const templateId = parseWorkspaceTemplateId(record.templateId)
  const themeColor = parseNonEmptyString(record.themeColor)
  const layoutStyle = parseWorkspaceLayoutStyle(record.layoutStyle)
  if (!workspaceType || !templateId || !themeColor || !layoutStyle) return null

  const siteProjectKind = parseSiteProjectKind(record.siteProjectKind)
  const manifest: WorkspaceManifest = {
    name,
    title,
    description,
    locale,
    workspaceType,
    templateId,
    themeColor,
    layoutStyle
  }
  if (siteProjectKind) manifest.siteProjectKind = siteProjectKind
  return manifest
}

export function parseWorkspaceManifestJson(raw: string): WorkspaceManifest | null {
  try {
    return parseWorkspaceManifest(JSON.parse(raw))
  } catch {
    return null
  }
}

export function parseWorkspaceConfig(input: unknown): WorkspaceConfig {
  const record = assertRecord(input, 'workspace config', 'ko')
  const locale = coerceAppLocale(record.locale)
  const repository = assertRecord(record.repository, 'workspace repository', locale)

  const config: WorkspaceConfig = {
    authProvider: assertGitHubAuthProvider(record.authProvider, locale),
    locale,
    workspaceType: assertWorkspaceType(record.workspaceType, locale),
    siteProjectKind: coerceSiteProjectKind(record.siteProjectKind, locale),
    templateId: assertWorkspaceTemplateId(record.templateId, locale),
    title: assertNonEmptyString(record.title, 'title', locale),
    description: assertNonEmptyString(record.description, 'description', locale),
    themeColor: assertNonEmptyString(record.themeColor, 'themeColor', locale),
    layoutStyle: assertWorkspaceLayoutStyle(record.layoutStyle, locale),
    localDirectory: assertNonEmptyString(record.localDirectory, 'localDirectory', locale),
    repository: {
      mode: assertRepositoryMode(repository.mode, locale),
      providerId: assertGitRemoteProviderId(repository.providerId, locale)
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

function assertRecord(value: unknown, label: string, locale: AppLocale): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      locale === 'ko'
        ? `${translateLabel(label, locale)} 형식이 올바르지 않습니다.`
        : `Invalid ${label}.`
    )
  }

  return value as Record<string, unknown>
}

function assertNonEmptyString(value: unknown, label: string, locale: AppLocale): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      locale === 'ko'
        ? `${translateLabel(label, locale)} 값이 비어 있거나 올바르지 않습니다.`
        : `Invalid ${label}.`
    )
  }

  return value.trim()
}

function assertGitHubAuthProvider(value: unknown, locale: AppLocale): 'github' {
  if (value !== 'github') {
    throw new Error(locale === 'ko' ? '지원하지 않는 인증 제공자입니다.' : 'Unsupported authProvider.')
  }

  return value
}

function coerceAppLocale(value: unknown): AppLocale {
  if (typeof value === 'string' && locales.has(value as AppLocale)) {
    return value as AppLocale
  }
  return 'ko'
}

function assertWorkspaceType(value: unknown, locale: AppLocale): WorkspaceType {
  if (typeof value !== 'string' || !workspaceTypes.has(value as WorkspaceType)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 워크스페이스 유형입니다.' : 'Unsupported workspaceType.')
  }

  return value as WorkspaceType
}

function assertWorkspaceTemplateId(value: unknown, locale: AppLocale): WorkspaceTemplateId {
  if (typeof value !== 'string' || !knownTemplateIdStrings.has(value)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 템플릿입니다.' : 'Unsupported templateId.')
  }

  return 'blog'
}

/** Empty/missing → `column`; invalid values throw when `locale` is provided. */
function coerceSiteProjectKind(value: unknown, locale?: AppLocale): SiteProjectKind {
  if (value === undefined || value === null || value === '') {
    return 'column'
  }
  if (typeof value !== 'string' || !siteProjectKinds.has(value as SiteProjectKind)) {
    if (locale) {
      throw new Error(locale === 'ko' ? '지원하지 않는 사이트 유형입니다.' : 'Unsupported siteProjectKind.')
    }
    return null as never
  }

  return value as SiteProjectKind
}

function assertWorkspaceLayoutStyle(value: unknown, locale: AppLocale): WorkspaceLayoutStyle {
  if (typeof value !== 'string' || !layoutStyles.has(value as WorkspaceLayoutStyle)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 레이아웃입니다.' : 'Unsupported layoutStyle.')
  }

  return value as WorkspaceLayoutStyle
}

function assertGitRemoteProviderId(value: unknown, locale: AppLocale): GitRemoteProviderId {
  if (typeof value !== 'string' || !providerIds.has(value as GitRemoteProviderId)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 저장소 제공자입니다.' : 'Unsupported repository provider.')
  }

  return value as GitRemoteProviderId
}

function assertRepositoryMode(value: unknown, locale: AppLocale): RepositorySetupMode {
  if (typeof value !== 'string' || !repositoryModes.has(value as RepositorySetupMode)) {
    throw new Error(locale === 'ko' ? '지원하지 않는 저장소 모드입니다.' : 'Unsupported repository mode.')
  }

  return value as RepositorySetupMode
}

function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim()
}

function parseWorkspaceType(value: unknown): WorkspaceType | null {
  if (typeof value === 'string' && workspaceTypes.has(value as WorkspaceType)) {
    return value as WorkspaceType
  }
  return null
}

function parseWorkspaceTemplateId(value: unknown): WorkspaceTemplateId | null {
  if (typeof value === 'string' && knownTemplateIdStrings.has(value)) {
    return 'blog'
  }
  return null
}

function parseSiteProjectKind(value: unknown): SiteProjectKind | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string' && siteProjectKinds.has(value as SiteProjectKind)) {
    return value as SiteProjectKind
  }
  return null
}

function parseWorkspaceLayoutStyle(value: unknown): WorkspaceLayoutStyle | null {
  if (typeof value === 'string' && layoutStyles.has(value as WorkspaceLayoutStyle)) {
    return value as WorkspaceLayoutStyle
  }
  return null
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
