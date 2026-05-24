import type {
  AppLocale,
  RepositorySetupMode,
  WorkspaceLayoutStyle,
  WorkspaceType
} from '@emprint/shared'
import type { SidebarSection } from '@renderer/state/app-store'

const messages = {
  ko: {
    localeLabel: '한국어',
    englishLabel: 'English',
    language: '언어',
    sectionOrderLabel: '1-6 섹션 이동',
    sectionDivider: '/',
    steps: ['인증', '워크스페이스 유형', '템플릿', '구성', '저장소', '디렉터리'],
    sectionNames: {
      posts: '포스트',
      index: '인덱스',
      knowledge: '지식',
      drafts: '드래프트',
      sections: '섹션',
      assets: '에셋',
      design: '디자인',
      imprint: '발행 기록',
      settings: '설정'
    },
    sectionHints: {
      posts: '발행된 글',
      index: '주제 색인 트리',
      knowledge: '발행된 지식 항목',
      drafts: '작업 중인 초안',
      sections: '시맨틱 섹션',
      assets: '이미지와 미디어',
      design: '템플릿 · 코드',
      imprint: '커밋 그래프와 발행 이력',
      settings: '워크스페이스 구성'
    },
    workspaceTypes: {
      creator: '크리에이터',
      developer: '개발자',
      ai: 'AI'
    },
    repositoryModes: {
      create: '새 저장소 생성',
      clone: '기존 저장소 복제'
    },
    layoutStyles: {
      editorial: '에디토리얼',
      notebook: '노트북',
      magazine: '매거진'
    },
    layoutDescriptions: {
      editorial: '문서 중심의 밀도 있는 워크스페이스',
      notebook: '조용한 연구와 정리에 어울리는 구성',
      magazine: '발행과 쇼케이스에 어울리는 레이아웃'
    },
    shell: {
      commandPalette: '명령 팔레트',
      commandPalettePlaceholder: '섹션, 런타임 명령, 워크스페이스 동작 검색',
      commandPaletteEmpty: '일치하는 명령이나 이동 대상이 없습니다.',
      commandMeta: '명령',
      workspaceRuntime: '워크스페이스 런타임',
      quietInfrastructure: '생각과 코드, 버전 기록을 조용히 보존하는 로컬 런타임입니다.',
      sections: '섹션',
      workspaceRoot: '워크스페이스 루트',
      archiveStructure: '아카이브 구조',
      philosophy: '철학',
      philosophyBody: '워크스페이스가 곧 제품이고, 앱은 그 위를 실행하는 런타임입니다.',
      posts: {
        eyebrow: '발행 아카이브',
        title: '기록된 글은 포터블한 파일로 남습니다.',
        description: '포스트는 앱 안에 갇힌 레코드가 아니라 워크스페이스 안에 남는 실제 산출물로 다뤄집니다.'
      },
      drafts: {
        eyebrow: '작업의 잔여물',
        title: '초안은 결과물 가까이에 머뭅니다.',
        description: '미완성 문장, 구조 메모, 수정 흔적도 파일 소유권을 해치지 않고 계속 쌓여야 합니다.'
      },
      assets: {
        eyebrow: '미디어 선반',
        title: '에셋은 눈에 보이고 이동 가능한 상태를 유지합니다.',
        description: '이미지와 미디어는 저장소 안에 두고, 추가 메타데이터는 그 위가 아니라 옆에 쌓입니다.'
      },
      design: {
        eyebrow: '사이트 디자인',
        title: '템플릿과 코드로 사이트를 꾸밉니다.',
        description: '템플릿으로 색감을 고르거나, `src/` 파일을 Monaco로 직접 편집할 수 있습니다.'
      },
      settings: {
        eyebrow: '워크스페이스 계약',
        title: '구성은 명시적이고 점검 가능해야 합니다.',
        description: 'manifest, 명령 체계, 구조 규칙은 Emprint 밖에서도 이해할 수 있어야 합니다.'
      },
      timeline: '기록 타임라인',
      ownership: '소유권 정보',
      repositoryMode: '저장소 모드',
      provider: '제공자',
      template: '템플릿',
      layout: '레이아웃',
      footerSourceOfTruth: '마크다운이 항상 실제 소스입니다.',
      explorerPublished: '발행됨',
      explorerWorkspaceFiles: '워크스페이스 파일',
      explorerDraftFolders: '드래프트 폴더',
      explorerMediaRoots: '미디어 루트',
      explorerPreparedIndexes: '준비된 인덱스',
      explorerConfigFiles: '구성 파일',
      annotation: {
        live: '발행',
        draft: '초안',
        artifact: '산출물',
        post: '포스트',
        folder: '폴더',
        future: '예정',
        cache: '캐시',
        planned: '준비됨',
        active: '활성'
      },
      postsOverviewTitle: '워크스페이스 개요',
      postsOverviewDescription:
        '현재 MVP는 이미 앱 내부 레코드가 아니라 실제 파일 산출물을 중심으로 동작하는 워크스페이스 런타임 구조를 갖추고 있습니다.',
      published: '발행됨',
      draft: '초안',
      postsMetric: '포스트',
      artifactsMetric: '산출물',
      documentTrace: '문서 흔적',
      path: '경로',
      updated: '수정 시각',
      viewer: '뷰어',
      starterArtifact: '초기 마크다운 산출물',
      markdownLabel: '마크다운',
      workspaceDocument: '워크스페이스 문서',
      workspaceCreated: '워크스페이스가 생성되었습니다',
      workspaceCreatedDescription: '첫 번째 산출물이 마크다운 중심 워크플로를 보여줍니다.',
      emptyStarter: '# 워크스페이스가 생성되었습니다\n\n이제 첫 번째 포스트를 작성해 보세요.',
      draftsTitle: '드래프트 영역',
      draftsDescription:
        '초안은 조용해야 합니다. 런타임은 미완성 조각을 즉시 발행으로 몰아가지 않고 그대로 보존해야 합니다.',
      draftItems: ['긴 글 초안 세션', '수정 메모와 구조 아웃라인', '향후 분할 편집 검토 흐름'],
      editorAbstraction: '에디터 추상화',
      editorAbstractionDescription:
        'TipTap은 여러 표면 중 하나일 뿐입니다. 문서 계층을 분리해 두어 앞으로 Monaco나 AI 편집기와도 저장 규약을 공유할 수 있습니다.',
      assetsShelf: '포터블 에셋 선반',
      assetsShelfDescription: '미디어는 `assets/` 아래에 두어 외부 편집기와 git 도구에서도 구조가 명확해야 합니다.',
      ingestionFlow: '유입 흐름',
      ingestionFlowDescription:
        '드래그 앤 드롭, 클립보드 붙여넣기, 후처리 훅은 모두 개별 컴포넌트가 아니라 명령 체계로 들어와야 합니다.',
      derivedMetadata: '파생 메타데이터',
      derivedMetadataDescription:
        '썸네일, 해시, AI 설명자는 다시 만들 수 있는 산출물이므로 `.workspace/`에 보관하는 것이 맞습니다.',
      indexingPipeline: '인덱싱 파이프라인',
      indexingDescription:
        '검색은 워크스페이스 파일을 대체하는 저장소가 아니라 그 위에 세우는 파생 캐시 레이어로 설계됩니다.',
      openPalette: '명령 팔레트 열기',
      pipelineLines: ['파일 시스템 이벤트', '-> 이벤트 큐', '-> 정규화 레이어', '-> 런타임 상태 갱신', '-> 재생성 가능한 인덱스 캐시'],
      preparedSearchModes: '준비된 검색 모드',
      preparedSearchModesDescription: '전문 검색, 태그 탐색, 그래프 관계, 의미 검색까지 모두 파생 레이어로 유지할 수 있습니다.',
      keyboardDirection: '키보드 중심 흐름',
      keyboardDirectionDescription: '팔레트는 이미 밀도 높은 제어 표면 역할을 하며, 다음 단계에서 실제 명령 실행과 연결됩니다.',
      manifest: '워크스페이스 manifest',
      commandRegistry: '명령 레지스트리',
      timelineItems: (workspaceResult: { createdAt: string; starterPath?: string; fileCount: number }) => [
        { title: '워크스페이스 초기화', meta: workspaceResult.createdAt },
        { title: 'manifest 기록', meta: '.workspace/manifest.json' },
        { title: '스타터 포스트 생성', meta: workspaceResult.starterPath ?? '스타터 포스트 없음' },
        { title: '파일 산출물 작성', meta: `디스크에 ${workspaceResult.fileCount}개 파일 생성` }
      ]
    },
    wizard: {
      productWordmarkSub: '워크스페이스 부트스트랩',
      badge: 'MVP 온보딩',
      heroTitle: '에디터보다 먼저 아카이브를 세웁니다.',
      heroDescription:
        '이 흐름은 파일 구조, git 연결, 앞으로의 런타임 서비스 확장을 고려한 로컬 우선 워크스페이스를 초기화합니다.',
      targetStructure: '대상 구조',
      designIntent: '디자인 의도',
      designIntentBody: '조용한 아카이브 무드, 높은 정보 밀도, 절제된 경계선, 키보드 중심 흐름을 기본값으로 둡니다.',
      portableLine: '포터블한 생각, 버전으로 남는 창작.',
      stepCounter: (current: number, total: number) => `${current} / ${total} 단계`,
      stepEyebrow: ['제공자 경계', '런타임 특화', '기능별 스캐폴드', '워크스페이스 정체성', 'git 백엔드', '로컬 루트'],
      stepHeadline: [
        '원격 제공자 계층을 연결합니다.',
        '워크스페이스 성격을 선택합니다.',
        '시작 템플릿을 고릅니다.',
        '워크스페이스의 정체성을 정합니다.',
        'git 관계를 설정합니다.',
        '로컬 디렉터리를 마운트합니다.'
      ],
      stepDescription: [
        '인증은 제공자 계층의 책임입니다. UI는 이를 안내하되 직접 소유하지 않습니다.',
        '워크스페이스 유형은 앞으로 명령, 패널, 서비스, 레이아웃 성격을 바꾸는 기준이 됩니다.',
        '템플릿은 기능 계층에 두어 블로그 MVP가 코어 런타임을 잠식하지 않도록 합니다.',
        '사용자 설정은 워크스페이스에 속하고, 파일로 남아 언제든지 점검할 수 있어야 합니다.',
        'git이 백엔드입니다. 원격 제공자는 생성 시 선택 사항이며 앞으로 교체 가능해야 합니다.',
        '선택한 로컬 디렉터리가 사용자 소유의 런타임 루트가 되며 앱 밖에서도 그대로 유지되어야 합니다.'
      ],
      githubTitle: 'GitHub 제공자 연결',
      githubDescription:
        '실제 OAuth 연결은 아직 없지만, 이 단계는 이미 콘텐츠 UI가 아니라 런타임 경계 위에 놓여 있습니다.',
      githubRuntimeNote:
        '제공자 관계를 명시적으로 두어 GitHub, GitLab, Gitea, self-hosted 흐름이 같은 부트 시퀀스를 공유할 수 있게 합니다.',
      githubConnected: 'GitHub 연결됨',
      githubContinue: 'GitHub로 계속',
      currentPlaceholder: '현재는 스캐폴드 단계용 자리 표시자입니다.',
      securityBoundary: '보안 경계',
      securityBoundaryDescription: '렌더러 접근은 preload API와 타입이 있는 IPC 계약 뒤로만 열어 둡니다.',
      creatorWorkspace: '크리에이터 워크스페이스',
      creatorWorkspaceDescription: '발행, 노트, 드래프트를 파일 중심으로 운영하는 기본 워크스페이스입니다.',
      developerWorkspace: '개발자 워크스페이스',
      developerWorkspaceDescription: '다음 런타임 특화 단계에서 이어질 예정입니다.',
      active: '활성',
      placeholder: '예정',
      creatorOnlyMessage:
        '현재 구현된 MVP 경로는 크리에이터 워크스페이스입니다. 개발자와 AI 워크스페이스는 같은 런타임 위에 이어 붙을 예정입니다.',
      workspaceTitle: '워크스페이스 제목',
      themeColor: '테마 색상',
      description: '설명',
      descriptionPlaceholder: '이 워크스페이스가 어떤 작업을 담는지 설명해 주세요.',
      layoutAndTone: '레이아웃과 무드',
      accentSwatches: '강조색 후보',
      repositoryCreateDescription: '로컬 저장소를 초기화하고 필요하다면 원격 저장소를 연결합니다.',
      repositoryCloneDescription: '비어 있는 디렉터리에 Emprint 호환 저장소를 복제합니다.',
      repositoryName: '저장소 이름',
      remoteUrl: '원격 저장소 주소',
      localWorkspaceRoot: '로컬 워크스페이스 루트',
      localWorkspaceRootDescription: '새 워크스페이스 생성과 저장소 복제 모두 비어 있는 폴더를 대상으로 진행합니다.',
      noDirectorySelected: '아직 디렉터리를 선택하지 않았습니다.',
      selectFolder: '폴더 선택',
      back: '이전',
      continue: '다음',
      initializing: '초기화 중...',
      initializeWorkspace: '워크스페이스 초기화',
      currentDraft: '현재 설정 초안',
      type: '유형',
      portableOutputs: '생성될 산출물',
      portableOutputItems: ['마크다운 포스트', 'git 저장소', '워크스페이스 manifest', '파생 캐시 디렉터리'],
      directoryStatus: '디렉터리 상태',
      awaitingDirectory: '워크스페이스 루트 선택을 기다리는 중입니다.',
      defaultTitle: '엠프린트 작업실',
      defaultDescription: '마크다운과 git을 중심으로 창작의 흔적을 쌓아 가는 로컬 우선 워크스페이스입니다.'
    }
  },
  en: {
    localeLabel: 'Korean',
    englishLabel: 'English',
    language: 'Language',
    sectionOrderLabel: 'Jump to sections 1-6',
    sectionDivider: '/',
    steps: ['Authenticate', 'Workspace Type', 'Template', 'Configure', 'Repository', 'Directory'],
    sectionNames: {
      posts: 'Posts',
      index: 'Index',
      knowledge: 'Knowledge',
      drafts: 'Drafts',
      sections: 'Sections',
      assets: 'Assets',
      design: 'Design',
      imprint: 'Imprint',
      settings: 'Settings'
    },
    sectionHints: {
      posts: 'Published writing',
      index: 'Topic index tree',
      knowledge: 'Published knowledge entries',
      drafts: 'Works in progress',
      sections: 'Semantic sections',
      assets: 'Images and media',
      design: 'Template or code',
      imprint: 'Commit history and publish log',
      settings: 'Workspace configuration'
    },
    workspaceTypes: {
      creator: 'Creator',
      developer: 'Developer',
      ai: 'AI'
    },
    repositoryModes: {
      create: 'Create Repository',
      clone: 'Clone Repository'
    },
    layoutStyles: {
      editorial: 'Editorial',
      notebook: 'Notebook',
      magazine: 'Magazine'
    },
    layoutDescriptions: {
      editorial: 'A dense workspace centered on documents',
      notebook: 'A calmer composition for research and note-taking',
      magazine: 'A layout suited to publishing and showcase work'
    },
    shell: {
      commandPalette: 'Command Palette',
      commandPalettePlaceholder: 'Search sections, runtime commands, and workspace actions',
      commandPaletteEmpty: 'No matching commands or navigation targets.',
      commandMeta: 'command',
      workspaceRuntime: 'Workspace Runtime',
      quietInfrastructure: 'A quiet local runtime for preserving thought, code, and version history.',
      sections: 'Sections',
      workspaceRoot: 'Workspace Root',
      archiveStructure: 'Archive Structure',
      philosophy: 'Philosophy',
      philosophyBody: 'The workspace is the product, and the app is the runtime that serves it.',
      posts: {
        eyebrow: 'Published archive',
        title: 'Written records remain as portable files.',
        description: 'Posts are treated as durable workspace artifacts instead of records trapped inside an app shell.'
      },
      drafts: {
        eyebrow: 'Working residue',
        title: 'Drafts stay close to the final archive.',
        description: 'Unfinished sentences, structural notes, and revision traces should be able to accumulate without losing file ownership.'
      },
      assets: {
        eyebrow: 'Media shelf',
        title: 'Assets stay visible and movable.',
        description: 'Images and media live in the repository, while additional metadata accumulates beside them instead of on top of them.'
      },
      design: {
        eyebrow: 'Site design',
        title: 'Shape the site with template or code.',
        description: 'Pick a color template or edit `src/` files directly with Monaco.'
      },
      settings: {
        eyebrow: 'Workspace contract',
        title: 'Configuration should stay explicit and inspectable.',
        description: 'The manifest, command system, and structure rules should remain understandable even outside Emprint.'
      },
      timeline: 'Trace Timeline',
      ownership: 'Ownership',
      repositoryMode: 'Repository Mode',
      provider: 'Provider',
      template: 'Template',
      layout: 'Layout',
      footerSourceOfTruth: 'Markdown always remains the source of truth.',
      explorerPublished: 'Published',
      explorerWorkspaceFiles: 'Workspace Files',
      explorerDraftFolders: 'Draft Folders',
      explorerMediaRoots: 'Media Roots',
      explorerPreparedIndexes: 'Prepared Indexes',
      explorerConfigFiles: 'Configuration Files',
      annotation: {
        live: 'live',
        draft: 'draft',
        artifact: 'artifact',
        post: 'post',
        folder: 'folder',
        future: 'future',
        cache: 'cache',
        planned: 'planned',
        active: 'active'
      },
      postsOverviewTitle: 'Workspace Overview',
      postsOverviewDescription:
        'The current MVP already operates as a workspace runtime built around real file artifacts instead of app-owned records.',
      published: 'published',
      draft: 'draft',
      postsMetric: 'Posts',
      artifactsMetric: 'Artifacts',
      documentTrace: 'Document Trace',
      path: 'Path',
      updated: 'Updated',
      viewer: 'Viewer',
      starterArtifact: 'Starter Markdown Artifact',
      markdownLabel: 'markdown',
      workspaceDocument: 'Workspace Document',
      workspaceCreated: 'Workspace Created',
      workspaceCreatedDescription: 'The first artifact demonstrates the Markdown-first workflow.',
      emptyStarter: '# Workspace created\n\nWrite your first post to begin.',
      draftsTitle: 'Draft Lane',
      draftsDescription:
        'Drafts should stay quiet. The runtime should preserve unfinished fragments without forcing them toward immediate publication.',
      draftItems: ['Long-form draft sessions', 'Revision notes and structural outlines', 'Future split-editor review flows'],
      editorAbstraction: 'Editor Abstraction',
      editorAbstractionDescription:
        'TipTap is only one surface. The document layer is already separated so Monaco or future AI editors can share persistence contracts.',
      assetsShelf: 'Portable Asset Shelf',
      assetsShelfDescription: 'Media should live under `assets/` so the structure remains legible in external editors and git tools.',
      ingestionFlow: 'Ingestion Flow',
      ingestionFlowDescription:
        'Drag and drop, clipboard paste, and processing hooks should enter through the command system instead of one-off component logic.',
      derivedMetadata: 'Derived Metadata',
      derivedMetadataDescription:
        'Thumbnails, hashes, and AI descriptors belong in `.workspace/` because they are rebuildable outputs.',
      indexingPipeline: 'Indexing Pipeline',
      indexingDescription:
        'Search is designed as a derived cache layer over workspace files, not as a datastore that replaces them.',
      openPalette: 'Open Command Palette',
      pipelineLines: ['filesystem event', '-> event queue', '-> normalization layer', '-> runtime state update', '-> rebuildable index cache'],
      preparedSearchModes: 'Prepared Search Modes',
      preparedSearchModesDescription: 'Full-text search, tag discovery, graph relations, and semantic retrieval can all remain derived layers.',
      keyboardDirection: 'Keyboard-First Flow',
      keyboardDirectionDescription: 'The palette already acts as a dense control surface, ready to connect to real runtime execution next.',
      manifest: 'Workspace Manifest',
      commandRegistry: 'Command Registry',
      timelineItems: (workspaceResult: { createdAt: string; starterPath?: string; fileCount: number }) => [
        { title: 'Workspace Initialized', meta: workspaceResult.createdAt },
        { title: 'Manifest Written', meta: '.workspace/manifest.json' },
        { title: 'Starter Post Generated', meta: workspaceResult.starterPath ?? 'No starter post' },
        { title: 'Artifacts Materialized', meta: `${workspaceResult.fileCount} files written to disk` }
      ]
    },
    wizard: {
      productWordmarkSub: 'Workspace Bootstrap',
      badge: 'MVP Onboarding',
      heroTitle: 'Build the archive before the editor.',
      heroDescription:
        'This flow initializes a local-first workspace with explicit file structure, git wiring, and room for future runtime services.',
      targetStructure: 'Target Structure',
      designIntent: 'Design Intent',
      designIntentBody: 'The default mood emphasizes a quiet archive, dense workspace structure, restrained borders, and keyboard-first flow.',
      portableLine: 'Portable thought, versioned creativity.',
      stepCounter: (current: number, total: number) => `Step ${current} of ${total}`,
      stepEyebrow: ['Provider Boundary', 'Runtime Specialization', 'Feature Scaffold', 'Workspace Identity', 'Git Backend', 'Local Root'],
      stepHeadline: [
        'Connect the remote provider layer.',
        'Choose the workspace personality.',
        'Pick a starting template.',
        'Shape the workspace identity.',
        'Set the git relationship.',
        'Mount the local directory.'
      ],
      stepDescription: [
        'Authentication belongs to the provider layer. The UI should guide it without owning it directly.',
        'Workspace type will later influence commands, panels, services, and layout personality.',
        'Templates live in feature layers so the blog MVP does not take over the core runtime.',
        'User configuration belongs to the workspace and should stay inspectable as files.',
        'Git is the backend. Remote providers are optional during creation and should remain replaceable.',
        'The chosen local directory becomes the user-owned runtime root and should stay portable outside the app.'
      ],
      githubTitle: 'GitHub Provider Link',
      githubDescription:
        'Real OAuth is not wired yet, but this step already sits at the runtime boundary rather than inside content UI.',
      githubRuntimeNote:
        'Keeping provider relationships explicit allows GitHub, GitLab, Gitea, and self-hosted flows to share the same boot sequence.',
      githubConnected: 'GitHub Connected',
      githubContinue: 'Continue with GitHub',
      currentPlaceholder: 'Current scaffold placeholder step',
      securityBoundary: 'Security Boundary',
      securityBoundaryDescription: 'Renderer access stays behind preload APIs and typed IPC contracts.',
      creatorWorkspace: 'Creator Workspace',
      creatorWorkspaceDescription: 'A file-first workspace for publishing, notes, and drafts.',
      developerWorkspace: 'Developer Workspace',
      developerWorkspaceDescription: 'Reserved for the next phase of runtime specialization.',
      active: 'active',
      placeholder: 'placeholder',
      creatorOnlyMessage:
        'The currently implemented MVP path is the creator workspace. Developer and AI workspaces will attach to the same runtime later.',
      workspaceTitle: 'Workspace Title',
      themeColor: 'Theme Color',
      description: 'Description',
      descriptionPlaceholder: 'Describe what this workspace is meant to hold.',
      layoutAndTone: 'Layout and Tone',
      accentSwatches: 'Accent Swatches',
      repositoryCreateDescription: 'Initialize a local repository and optionally attach a remote.',
      repositoryCloneDescription: 'Clone an Emprint-compatible repository into an empty directory.',
      repositoryName: 'Repository Name',
      remoteUrl: 'Remote URL',
      localWorkspaceRoot: 'Local Workspace Root',
      localWorkspaceRootDescription: 'Both workspace creation and repository cloning should target an empty folder.',
      noDirectorySelected: 'No directory has been selected yet.',
      selectFolder: 'Select Folder',
      back: 'Back',
      continue: 'Continue',
      initializing: 'Initializing...',
      initializeWorkspace: 'Initialize Workspace',
      currentDraft: 'Current Draft',
      type: 'Type',
      portableOutputs: 'Portable Outputs',
      portableOutputItems: ['Markdown posts', 'Git repository', 'Workspace manifest', 'Derived cache directory'],
      directoryStatus: 'Directory Status',
      awaitingDirectory: 'Waiting for a workspace root to be selected.',
      defaultTitle: 'Emprint Studio',
      defaultDescription: 'A local-first workspace for preserving creative traces through Markdown and git.'
    }
  }
} as const

export function getLocaleMessages(locale: AppLocale) {
  return messages[locale]
}

export function getSectionLabel(locale: AppLocale, section: SidebarSection): string {
  return messages[locale].sectionNames[section]
}

export function getSectionHint(locale: AppLocale, section: SidebarSection): string {
  return messages[locale].sectionHints[section]
}

export function getWorkspaceTypeLabel(locale: AppLocale, workspaceType: WorkspaceType): string {
  return messages[locale].workspaceTypes[workspaceType]
}

export function getRepositoryModeLabel(locale: AppLocale, mode: RepositorySetupMode): string {
  return messages[locale].repositoryModes[mode]
}

export function getLayoutStyleLabel(locale: AppLocale, style: WorkspaceLayoutStyle): string {
  return messages[locale].layoutStyles[style]
}

export function getLayoutStyleDescription(locale: AppLocale, style: WorkspaceLayoutStyle): string {
  return messages[locale].layoutDescriptions[style]
}

/** Locale-specific string without a full i18n catalog entry. */
export function pick(locale: AppLocale, en: string, ko: string): string {
  return locale === 'ko' ? ko : en
}
