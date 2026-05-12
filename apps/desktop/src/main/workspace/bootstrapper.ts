import path from 'node:path'
import type { FileSystemGateway } from '../infrastructure/file-system-gateway'
import type { GitProviderFactory } from '../infrastructure/git-provider'
import { getSiteProjectGenerator } from '../site-generation/site-generator-registry'
import { MANIFEST_RELATIVE_PATH, REQUIRED_WORKSPACE_DIRECTORIES, WORKSPACE_DIR } from '../workspace-paths'
import { createStarterPostArtifact, createWorkspaceCacheReadme } from './starter-post'
import type { AppLocale, InitializeWorkspaceResult, WorkspaceConfig, WorkspaceManifest } from '@emprint/shared'

export interface WorkspaceBootstrapperDependencies {
  fileSystem: FileSystemGateway
  gitProviderFactory: GitProviderFactory
}

export class WorkspaceBootstrapper {
  constructor(private readonly dependencies: WorkspaceBootstrapperDependencies) {}

  async initialize(config: WorkspaceConfig): Promise<InitializeWorkspaceResult> {
    const workspaceRoot = path.resolve(config.localDirectory)
    const fileSystem = this.dependencies.fileSystem
    const gitProvider = this.dependencies.gitProviderFactory.create(config.repository.providerId)
    const manifestPath = path.join(workspaceRoot, MANIFEST_RELATIVE_PATH)

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

    for (const directory of REQUIRED_WORKSPACE_DIRECTORIES) {
      await fileSystem.ensureDirectory(path.join(workspaceRoot, directory))
    }

    let manifest = this.createManifest(config)

    if (config.repository.mode === 'clone' && (await fileSystem.fileExists(manifestPath))) {
      manifest = JSON.parse(await fileSystem.readFile(manifestPath)) as WorkspaceManifest
    }

    const starter = createStarterPostArtifact(config)
    const siteKind = config.siteProjectKind ?? 'column'
    const siteArtifacts = await getSiteProjectGenerator(siteKind).generate({
      title: config.title,
      description: config.description,
      locale: config.locale
    })
    const createdFiles: string[] = []

    const staticArtifacts = [
      {
        relativePath: '.workspace/manifest.json',
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
        relativePath: `${WORKSPACE_DIR.drafts}/.gitkeep`,
        content: ''
      },
      {
        relativePath: `${WORKSPACE_DIR.assets}/.gitkeep`,
        content: ''
      },
      {
        relativePath: '.gitignore',
        // Emprint convention:
        //  - drafts/ is a private staging area that never ships.
        //  - public/assets/ is regenerated from assets/ on every build, so
        //    it's a build artifact, not a source. The corresponding
        //    `scripts/sync-assets.mjs` produces it at predev/prebuild.
        content:
          [
            `${WORKSPACE_DIR.workspace}/cache`,
            '.DS_Store',
            'node_modules',
            'dist',
            '.astro',
            'public/assets',
            WORKSPACE_DIR.drafts
          ].join('\n') + '\n'
      },
      {
        relativePath: 'README.md',
        content: createWorkspaceReadme(config)
      },
      {
        relativePath: starter.relativePath,
        content: starter.content
      }
    ]

    for (const artifact of [...staticArtifacts, ...siteArtifacts]) {
      const absolutePath = path.join(workspaceRoot, artifact.relativePath)

      if (await fileSystem.fileExists(absolutePath)) {
        continue
      }

      await fileSystem.writeFile(absolutePath, artifact.content)
      createdFiles.push(artifact.relativePath)
    }

    return {
      workspaceRoot,
      createdFiles,
      manifest,
      starterPost: starter.summary,
      starterPostContent: starter.content
    }
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

function slugify(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'workspace'
}

function createWorkspaceReadme(config: WorkspaceConfig): string {
  if (config.locale === 'ko') {
    return [
      `# ${config.title}`,
      '',
      config.description || '_(설명 없음)_',
      '',
      '> 이 폴더는 [Emprint](https://github.com/) 으로 관리되는 블로그 워크스페이스입니다. 보통은 Emprint 앱 안에서만 사용하면 충분합니다.',
      '',
      '## 워크스페이스 구조',
      '',
      '| 폴더 | 역할 |',
      '| --- | --- |',
      '| `posts/` | 발행할 마크다운 글. **`발행` 버튼을 누르면 push되어 사이트에 공개됩니다.** |',
      '| `drafts/` | 개인 초안. **공개되지 않습니다** (자동으로 `.gitignore` 처리). |',
      '| `assets/images/` | 글에 첨부한 이미지. 빌드 시 자동으로 사이트에 동기화됩니다. |',
      '| `src/` | 사이트(Astro) 코드. UI를 직접 손볼 일이 없다면 그대로 두어도 됩니다. |',
      '',
      '## 매일의 흐름',
      '',
      '1. Emprint 앱 → `Posts` 또는 `Drafts` 에서 글을 쓰고 저장합니다.',
      '2. 사이드바 하단 **발행** 버튼으로 변경사항을 한 번에 push 합니다.',
      '3. GitHub Actions가 자동으로 사이트를 빌드해 GitHub Pages에 배포합니다.',
      '',
      '## 직접 작업하고 싶다면',
      '',
      '- 모든 글은 일반 마크다운 파일이므로, VSCode 같은 다른 편집기로 열어 수정해도 됩니다.',
      '- 로컬에서 사이트 미리보기: `npm install` → `npm run dev`',
      '- 로컬에서 정적 빌드 확인: `npm run build` → `npm run preview`',
      '',
      '## 백업과 이식성',
      '',
      '이 워크스페이스는 Emprint 밖에서도 그대로 사용할 수 있습니다.',
      '마크다운 파일과 git 기록이 항상 실제 소스입니다.'
    ].join('\n')
  }

  return [
    `# ${config.title}`,
    '',
    config.description || '_(no description)_',
    '',
    '> This folder is a blog workspace managed by [Emprint](https://github.com/). Day-to-day you only need to use the Emprint app.',
    '',
    '## Workspace layout',
    '',
    '| Folder | Purpose |',
    '| --- | --- |',
    '| `posts/` | Markdown to publish. **The Publish button pushes these and they go live on the site.** |',
    '| `drafts/` | Private drafts. **Never published** (auto-added to `.gitignore`). |',
    '| `assets/images/` | Images attached to posts. Synced into the site at build time. |',
    '| `src/` | Astro site code. Leave it alone unless you want to tweak the UI. |',
    '',
    '## Day-to-day flow',
    '',
    '1. Open the Emprint app → write under `Posts` or `Drafts` and save.',
    '2. Use the **Publish** button at the bottom of the sidebar to push everything at once.',
    '3. GitHub Actions builds the site and deploys it to GitHub Pages automatically.',
    '',
    '## Working outside Emprint',
    '',
    '- Every post is plain Markdown, so feel free to edit in VSCode or any other editor.',
    '- Preview the site locally: `npm install`, then `npm run dev`.',
    '- Verify the static build: `npm run build`, then `npm run preview`.',
    '',
    '## Portability',
    '',
    'This workspace remains portable outside Emprint.',
    'Markdown files and git history always remain the source of truth.'
  ].join('\n')
}

function localeMessage(korean: string, english: string, locale: AppLocale): string {
  return locale === 'ko' ? korean : english
}
