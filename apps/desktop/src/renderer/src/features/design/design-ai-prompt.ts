import { pick } from '@renderer/lib/i18n'
import type { AppLocale, SiteProjectKind, WorkspaceConfig } from '@emprint/shared'

export interface DesignAiPromptInput {
  locale: AppLocale
  workspaceConfig?: WorkspaceConfig | undefined
  moodAndTheme: string
  requirements: string
}


function projectKindLabel(locale: AppLocale, _kind?: SiteProjectKind): string {
  return pick(locale, 'column / editorial blog', '칼럼 · 글 중심 블로그')
}

/** Static context bundled into every generated prompt (bilingual sections). */
export function buildDesignAiPromptBaseContext(locale: AppLocale): string {
  const en = `## Emprint anthology — site customization brief (for an AI coding assistant)

You are helping customize the **public Astro site** inside an **Emprint anthology** (local-first writing workspace). The user edits the live site under \`src/\` in the Design → Code panel, or uses Template mode for color presets. Your job: propose **concrete file paths** and **full file contents** (or precise search/replace hunks) so the user can paste your answer into their repo.

### What Emprint already owns (do NOT break)
- **Posts** live as Markdown in \`posts/\` at the anthology root (NOT under \`src/\`). The Astro content layer loads them via \`src/content.config.ts\` with a glob loader on \`./posts/*.md\`.
- **Drafts** live in \`drafts/\` and are **gitignored** — never published.
- **Images** live in \`assets/images/\`. A sync script copies them to \`public/assets/\` before dev/build so markdown can reference \`/assets/...\`.
- **Publishing**: user commits in Emprint → push to GitHub → GitHub Actions builds Astro → GitHub Pages. Site URL pattern: \`https://<github-user>.github.io/<repo-name>/\`.
- **Template mode** applies **Emprint** or **Paper & Ink** palettes + layout via \`config/theme.json\` (canonical colors in \`shared/src/cross/canonical-palettes.ts\` — do not invent hex). Site **colorMode** is unchanged on Template apply; visitors toggle light/dark on the live site. Run \`npm run theme:sync\` after edits. See \`docs/COLOR_PALETTES.md\`.

### Anthology site stack
- **Astro 6** static site (\`output: 'static'\`), \`trailingSlash: 'always'\`
- TypeScript strict config extending \`astro/tsconfigs/strict\`
- No React/Vue app shell — **.astro** components + vanilla CSS in \`src/styles/global.css\`
- Deploy workflow sets \`GHP_SITE\` / \`GHP_BASE\` for project Pages (\`base\` like \`/<repo>/\`)

### \`src/\` layout (blog/column scaffold — typical paths)
\`\`\`
src/
  content.config.ts      # Astro content collections; glob loader → ../posts/*.md
  env.d.ts                 # /// <reference types="astro/client" />
  styles/
    global.css             # Site-wide CSS variables, layout, typography, components
  components/
    Header.astro           # Site header / nav
    Footer.astro           # Site footer
    PostCard.astro         # Card used in post lists
  layouts/
    Layout.astro           # HTML shell, imports global.css, Header, Footer
    PostLayout.astro       # Single post page wrapper
  pages/
    index.astro            # Home (recent posts)
    posts/
      index.astro          # All posts list
      [...slug].astro      # Individual post page (render markdown body)
    tags/
      index.astro          # Tag index
      [tag].astro          # Posts filtered by tag
\`\`\`

### Root files the site depends on (reference only — edit only if needed)
- \`astro.config.mjs\` — \`site\`, \`base\`, static output
- \`package.json\` — \`astro\` dependency, \`dev\` / \`build\` scripts
- \`tsconfig.json\` — extends Astro strict
- \`.github/workflows/deploy-astro-gh-pages.yml\` — CI deploy

### CSS theming conventions (\`src/styles/global.css\`)
- Uses CSS custom properties on \`:root\`, e.g. \`--bg\`, \`--surface\`, \`--ink\`, \`--muted\`, \`--rule\`, \`--accent\`, \`--accent-soft\`, \`--font-sans\`, \`--font-serif\`, \`--font-mono\`, \`--measure\`
- Layout helpers: \`.container\`, \`.wide\`, \`.post-card\`, \`.prose\`, etc.
- Prefer **changing variables** over rewriting every component when adjusting mood/color/type.

### Content / data rules
- Post frontmatter fields (Zod in content.config): \`title\`, \`description?\`, \`tags[]\`, \`draft\`, \`createdAt?\`, \`updatedAt?\`
- Pages filter \`draft: true\` out of public lists
- Do not move posts into \`src/\`; keep the \`posts/\` + content collection pattern

### How to answer (required format)
1. Short plan (2–5 bullets): what files you will touch and why.
2. For **each file changed**, output:
   - Path (relative to anthology root, e.g. \`src/styles/global.css\`)
   - Either **complete new file content** in a fenced code block with the correct language tag, OR explicit before/after snippets if the change is tiny.
3. Mention any **npm packages** only if truly required (default: no new deps).
4. Note **preview**: run \`npm run dev\` in the anthology folder, or use Emprint Design → “Open site preview”.
5. Do **not** delete or relocate \`posts/\`, \`drafts/\`, or \`assets/\` unless the user explicitly asks.

### Constraints
- Keep the site **static** (no server endpoints).
- Preserve accessibility: sufficient contrast, focus states, semantic headings.
- Keep Korean + Latin typography in mind (\`global.css\` already lists Pretendard / Noto Serif KR fallbacks).
- GitHub Pages project-site safe: avoid hard-coded \`http://localhost\` links in production markup.`

  const ko = `## Emprint 앤솔로지 — 사이트 커스터마이징 브리프 (AI 코딩 어시스턴트용)

당신은 **Emprint 앤솔로지**(로컬 우선 글쓰기 워크스페이스) 안의 **공개 Astro 사이트**를 커스터마이징하도록 돕습니다. 사용자는 디자인 → 코드에서 \`src/\`를 편집하거나, 템플릿 모드로 색 프리셋을 적용합니다. 당신의 역할: **구체적인 파일 경로**와 **전체 파일 내용**(또는 정확한 검색/치환 단위)을 제시해 사용자가 답변을 저장소에 반영할 수 있게 하는 것입니다.

### Emprint가 이미 담당하는 것 (깨지 말 것)
- **게시글**은 앤솔로지 루트의 \`posts/\`에 Markdown으로 있습니다(\`src/\` 밖). Astro 콘텐츠 레이어는 \`src/content.config.ts\`에서 \`./posts/*.md\` glob 로더로 읽습니다.
- **초안**은 \`drafts/\`에 있으며 **gitignore** — 공개되지 않습니다.
- **이미지**는 \`assets/images/\`에 있으며, dev/build 전 동기화 스크립트가 \`public/assets/\`로 복사합니다.
- **발행**: Emprint에서 커밋 → GitHub 푸시 → Actions가 Astro 빌드 → GitHub Pages. URL: \`https://<github-계정>.github.io/<레포이름>/\`.
- **템플릿 모드**는 \`config/theme.json\`에 **Emprint** / **Paper & Ink** 프리셋(라이트·다크 포함)을 적용합니다. 전역 색·폰트는 \`theme.json\` 수정 후 \`npm run theme:sync\` 또는 Design → Code 저장으로 \`tokens.css\`를 재생성하세요.

### 사이트 스택
- **Astro 6** 정적 사이트, \`trailingSlash: 'always'\`
- \`astro/tsconfigs/strict\` 확장 TypeScript
- React/Vue 앱이 아니라 **.astro** + \`src/styles/global.css\`
- 배포 시 \`GHP_SITE\` / \`GHP_BASE\`로 project Pages base 설정

### \`src/\` 구조 (블로그/칼럼 스캐폴드)
(위 영문과 동일한 트리: content.config.ts, styles/global.css, components/, layouts/, pages/)

### 답변 형식 (필수)
1. 짧은 계획(2–5불릿): 어떤 파일을 왜 수정하는지
2. **변경하는 각 파일**마다: 경로 + 언어 태그가 맞는 **전체 파일** 코드 블록(작은 변경만 before/after)
3. 꼭 필요할 때만 npm 패키지 언급
4. 미리보기: 앤솔로지에서 \`npm run dev\` 또는 Emprint 디자인 → «사이트 미리보기»
5. 사용자 요청 없이 \`posts/\`, \`drafts/\`, \`assets/\` 삭제·이동 금지

### 제약
- 정적 사이트 유지, 접근성(대비·포커스·시맨틱 제목), 한글+라틴 타이포, GitHub Pages project site에 맞는 링크`

  return locale === 'ko' ? `${ko}\n\n---\n\n${en}` : `${en}\n\n---\n\n${ko}`
}

export function buildDesignAiPrompt(input: DesignAiPromptInput): string {
  const { locale, workspaceConfig, moodAndTheme, requirements } = input
  const base = buildDesignAiPromptBaseContext(locale)

  const anthologySection = workspaceConfig
    ? [
        pick(locale, '## This anthology', '## 이 앤솔로지'),
        '',
        `- **Title**: ${workspaceConfig.title}`,
        `- **Description**: ${workspaceConfig.description}`,
        `- **Site kind**: ${projectKindLabel(locale, workspaceConfig.siteProjectKind)}`,
        `- **Layout style (manifest)**: ${workspaceConfig.layoutStyle}`,
        `- **Theme accent (manifest)**: ${workspaceConfig.themeColor}`,
        `- **Local folder**: \`${workspaceConfig.localDirectory}\``,
        workspaceConfig.repository.remoteUrl
          ? `- **Git remote**: \`${workspaceConfig.repository.remoteUrl}\``
          : null,
        workspaceConfig.repository.repositoryName
          ? `- **Repository name**: \`${workspaceConfig.repository.repositoryName}\``
          : null
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const userSection = [
    pick(locale, '## User vision (fill in by the anthology owner)', '## 사용자 비전'),
    '',
    pick(locale, '### Mood, theme, and visual direction', '### 분위기·테마·시각적 방향'),
    moodAndTheme.trim() ||
      pick(
        locale,
        '(No extra mood/theme notes — use a calm editorial blog aesthetic aligned with existing CSS variables.)',
        '(추가 분위기 메모 없음 — 기존 CSS 변수와 어울리는 차분한 에디토리얼 블로그 톤을 사용하세요.)'
      ),
    '',
    pick(locale, '### Functional and layout requirements', '### 기능·레이아웃 요구사항'),
    requirements.trim() ||
      pick(
        locale,
        '(No extra requirements — improve typography, spacing, and header/footer polish without changing data sources.)',
        '(추가 요구 없음 — 데이터 소스는 유지한 채 타이포·여백·헤더/푸터만 다듬으세요.)'
      )
  ].join('\n')

  const taskSection = [
    pick(locale, '## Your task', '## 수행할 작업'),
    '',
    pick(
      locale,
      'Using the structure and constraints above, produce a **step-by-step implementation** for this anthology. Assume the user will paste your reply into ChatGPT, Claude, or Cursor and apply each file manually in Emprint Design → Code (or by editing files on disk). Be exhaustive: include every line of every file you change. If you touch `global.css`, show the full file after your edits. Suggest 1–2 optional enhancements only after the required changes.',
      '위 구조와 제약을 바탕으로 이 앤솔로지에 대한 **단계별 구현안**을 작성하세요. 사용자가 답변을 AI 챗에 붙여넣은 뒤 Emprint 디자인 → 코드(또는 디스크)에서 파일별로 적용한다고 가정하세요. 변경하는 모든 파일은 **줄 단위까지 전부** 포함하세요. `global.css`를 수정하면 수정 후 **파일 전체**를 보여주세요. 필수 변경 후에만 선택 개선 1–2개를 제안하세요.'
    )
  ].join('\n')

  return [base, anthologySection, userSection, taskSection].filter(Boolean).join('\n\n')
}
