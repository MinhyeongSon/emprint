import path from 'node:path'
import {
  EMPRINT_GITIGNORE_LINES,
  getRequiredWorkspaceDirectories,
  MANIFEST_RELATIVE_PATH,
  WORKSPACE_DIR,
  type AppLocale,
  type InitializeWorkspaceResult,
  type SiteProjectKind,
  type WorkspaceConfig,
  type WorkspaceManifest
} from '@emprint/shared'
import type { FileSystemGateway } from '../fs/file-system-gateway'
import type { GitProviderFactory } from '../git/contracts'
import type { SiteProjectGeneratorRegistry } from '../site/site-project-generator'
import { createStarterMemoirArtifacts } from './starter-memoir'
import { createStarterPostArtifact, createWorkspaceCacheReadme } from './starter-post'

export interface WorkspaceBootstrapperDependencies {
  fileSystem: FileSystemGateway
  gitProviderFactory: GitProviderFactory
  siteGenerators: SiteProjectGeneratorRegistry
}

export class WorkspaceBootstrapper {
  constructor(private readonly dependencies: WorkspaceBootstrapperDependencies) {}

  async initialize(config: WorkspaceConfig): Promise<InitializeWorkspaceResult> {
    const workspaceRoot = path.resolve(config.localDirectory)
    const fileSystem = this.dependencies.fileSystem
    const gitProvider = this.dependencies.gitProviderFactory.create(config.repository.providerId)
    const manifestPath = path.join(workspaceRoot, MANIFEST_RELATIVE_PATH)
    const siteKind: SiteProjectKind = config.siteProjectKind ?? 'column'

    await fileSystem.ensureDirectory(workspaceRoot)

    if (config.repository.mode === 'create') {
      await this.ensureDirectoryIsReady(workspaceRoot, config.locale)
      await gitProvider.init(workspaceRoot)

      if (config.repository.remoteUrl) {
        await gitProvider.addRemote(workspaceRoot, 'origin', config.repository.remoteUrl)
      }
    } else {
      if (!config.repository.remoteUrl) {
        throw new Error(
          config.locale === 'ko'
            ? '기존 저장소를 복제하려면 원격 저장소 주소가 필요합니다.'
            : 'A remote URL is required when cloning an existing repository.'
        )
      }

      await this.ensureDirectoryIsReady(workspaceRoot, config.locale)
      const cloneOptions = {
        directory: workspaceRoot,
        remoteUrl: config.repository.remoteUrl
      }

      if (config.repository.defaultBranch) {
        await gitProvider.clone({
          ...cloneOptions,
          defaultBranch: config.repository.defaultBranch
        })
      } else {
        await gitProvider.clone(cloneOptions)
      }
    }

    for (const directory of getRequiredWorkspaceDirectories(siteKind)) {
      await fileSystem.ensureDirectory(path.join(workspaceRoot, directory))
    }

    let manifest = this.createManifest(config)

    if (config.repository.mode === 'clone' && (await fileSystem.fileExists(manifestPath))) {
      manifest = JSON.parse(await fileSystem.readFile(manifestPath)) as WorkspaceManifest
    }

    const siteArtifacts = await this.dependencies.siteGenerators.get(siteKind).generate({
      title: config.title,
      description: config.description,
      locale: config.locale,
      themeColor: config.themeColor
    })

    const memoirStarters = siteKind === 'memoir' ? createStarterMemoirArtifacts(config) : []
    const columnStarter = siteKind === 'column' ? createStarterPostArtifact(config) : null

    const createdFiles: string[] = []
    let starterPost: InitializeWorkspaceResult['starterPost']
    let starterPostContent: string | undefined
    let starterSection: InitializeWorkspaceResult['starterSection']
    let starterSectionContent: string | undefined

    const staticArtifacts = [
      {
        relativePath: MANIFEST_RELATIVE_PATH,
        content: JSON.stringify(manifest, null, 2)
      },
      {
        relativePath: `${WORKSPACE_DIR.workspace}/README.md`,
        content: createWorkspaceCacheReadme(config.locale)
      },
      {
        relativePath: `${WORKSPACE_DIR.config}/site.json`,
        content: JSON.stringify(
          {
            title: config.title,
            description: config.description,
            themeColor: config.themeColor,
            layoutStyle: config.layoutStyle
          },
          null,
          2
        )
      },
      {
        relativePath: `${WORKSPACE_DIR.assets}/.gitkeep`,
        content: ''
      },
      {
        relativePath: '.gitignore',
        content: buildGitignore(siteKind)
      },
      {
        relativePath: 'README.md',
        content: createWorkspaceReadme(config)
      },
      ...(siteKind === 'column'
        ? [{ relativePath: `${WORKSPACE_DIR.drafts}/.gitkeep`, content: '' }]
        : []),
      ...(columnStarter
        ? [{ relativePath: columnStarter.relativePath, content: columnStarter.content }]
        : []),
      ...memoirStarters.map((a) => ({ relativePath: a.relativePath, content: a.content }))
    ]

    for (const artifact of [...staticArtifacts, ...siteArtifacts]) {
      const absolutePath = path.join(workspaceRoot, artifact.relativePath)

      if (await fileSystem.fileExists(absolutePath)) {
        continue
      }

      await fileSystem.writeFile(absolutePath, artifact.content)
      createdFiles.push(artifact.relativePath)
    }

    if (columnStarter) {
      starterPost = columnStarter.summary
      starterPostContent = columnStarter.content
    } else if (memoirStarters[0]) {
      starterSection = memoirStarters[0].summary
      starterSectionContent = memoirStarters[0].content
    }

    const result: InitializeWorkspaceResult = {
      workspaceRoot,
      createdFiles,
      manifest
    }
    if (starterPost) {
      result.starterPost = starterPost
      if (starterPostContent) result.starterPostContent = starterPostContent
    }
    if (starterSection) {
      result.starterSection = starterSection
      if (starterSectionContent) result.starterSectionContent = starterSectionContent
    }
    return result
  }

  private async ensureDirectoryIsReady(directory: string, locale: AppLocale): Promise<void> {
    const entries = await this.dependencies.fileSystem.listEntries(directory)
    const visibleEntries = entries.filter((entry) => entry !== '.DS_Store')

    if (visibleEntries.length > 0) {
      throw new Error(
        localeMessage(
          '새 워크스페이스는 비어 있는 디렉터리에서 시작해야 합니다. 기존 저장소를 가져올 때도 비어 있는 폴더를 선택해 주세요.',
          'Select an empty directory for new workspaces. Existing repositories can be cloned into an empty folder.',
          locale
        )
      )
    }
  }

  private createManifest(config: WorkspaceConfig): WorkspaceManifest {
    return {
      name: slugify(config.title),
      title: config.title,
      description: config.description,
      locale: config.locale,
      workspaceType: config.workspaceType,
      siteProjectKind: config.siteProjectKind ?? 'column',
      templateId: config.templateId,
      themeColor: config.themeColor,
      layoutStyle: config.layoutStyle
    }
  }
}

function buildGitignore(kind: SiteProjectKind): string {
  const lines = [
    `${WORKSPACE_DIR.workspace}/cache`,
    '.DS_Store',
    'node_modules',
    'dist',
    '.astro',
    'public/assets',
    ...EMPRINT_GITIGNORE_LINES.filter((line) => line !== 'drafts/')
  ]
  if (kind === 'column') {
    lines.push(WORKSPACE_DIR.drafts)
  }
  return lines.join('\n') + '\n'
}

function slugify(value: string): string {
  return (
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'workspace'
  )
}

function createWorkspaceReadme(config: WorkspaceConfig): string {
  if (config.locale === 'ko') {
    return [
      `# ${config.title}`,
      '',
      config.description || '_(설명 없음)_',
      '',
      '이 프로젝트는 **Emprint**로 만들어진 워크스페이스입니다.',
      '',
      config.siteProjectKind === 'memoir'
        ? '콘텐츠는 `sections/` 아래 시맨틱 JSON 섹션으로 구성됩니다.'
        : '글은 `posts/`와 `drafts/`에서 관리합니다.',
      '',
      '이 README.md 문서는 GitHub 저장소에서 마크다운 형식으로 확인할 수 있습니다.'
    ].join('\n')
  }

  return [
    `# ${config.title}`,
    '',
    config.description || '_(no description)_',
    '',
    'This project is a workspace created with **Emprint**.',
    '',
    config.siteProjectKind === 'memoir'
      ? 'Content lives as semantic JSON sections under `sections/`.'
      : 'Writing lives under `posts/` and `drafts/`.',
    '',
    'You can read this README.md on GitHub as rendered Markdown.'
  ].join('\n')
}

function localeMessage(korean: string, english: string, locale: AppLocale): string {
  return locale === 'ko' ? korean : english
}
