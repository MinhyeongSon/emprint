import type { WorkspaceArtifact } from '../workspace/workspace-template'
import type { SiteGenerationContext } from './site-project-generator'

/**
 * Astro site scaffold for emprint blog workspaces.
 *
 * Pipeline:
 *   1. `astroSharedArtifacts()` produces the framework skeleton (package
 *      manifest, config, tsconfig, public assets, CI workflow, README).
 *   2. `astroBlogLayoutArtifacts()` adds the visual shell (layouts,
 *      header/footer, components, global stylesheet).
 *   3. `columnIndexPage()` / `astroBlogPostPages()` etc. supply the pages.
 *
 * Posts living in the workspace root's `posts/` folder are loaded via Astro
 * v5+ content collections with the `glob` loader pointed at `./posts`. This
 * keeps emprint's "markdown on disk is the source of truth" model while
 * giving the site frontmatter validation and automatic markdown rendering.
 */

// Notes on the GHP_SITE / GHP_BASE wiring:
//   `actions/configure-pages@v5` derives the right values for both user/org
//   pages (base: `/`) and project pages (base: `/<repo>/`) and exposes them
//   as `origin` and `base_path` outputs. We pass those into Astro at build
//   time so generated asset URLs (`/_astro/…`) and internal links resolve
//   under the GitHub Pages sub-path instead of 404'ing at the apex domain.
//   `enablement: true` is a safety net: if our IPC-time pages enable call
//   was blocked (org policy, token scope, etc.) this still configures the
//   site on first push, since the workflow's `pages: write` permission is
//   scoped to this repo.
const ghPagesWorkflowLines = [
  'name: Deploy Astro to GitHub Pages',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '  workflow_dispatch:',
  '',
  'permissions:',
  '  contents: read',
  '  pages: write',
  '  id-token: write',
  '',
  'concurrency:',
  '  group: pages',
  '  cancel-in-progress: true',
  '',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  "          node-version: '22'",
  '      - id: pages',
  '        uses: actions/configure-pages@v5',
  '        with:',
  '          enablement: true',
  '      - run: npm install',
  '      - run: npm run build',
  '        env:',
  '          GHP_SITE: ${{ steps.pages.outputs.origin }}',
  '          GHP_BASE: ${{ steps.pages.outputs.base_path }}',
  '      - uses: actions/upload-pages-artifact@v3',
  '        with:',
  '          path: dist',
  '',
  '  deploy:',
  '    needs: build',
  '    runs-on: ubuntu-latest',
  '    environment:',
  '      name: github-pages',
  '      url: ${{ steps.deployment.outputs.page_url }}',
  '    steps:',
  '      - id: deployment',
  '        uses: actions/deploy-pages@v4'
]

const ghPagesWorkflowYaml = ghPagesWorkflowLines.join('\n')

const readmePagesDeployKo = [
  '## GitHub Pages 자동 배포',
  '',
  '`.github/workflows/deploy-astro-gh-pages.yml` 이 저장소에 포함되어 있습니다. `main` 브랜치에 푸시하면 Astro를 빌드한 뒤 Pages에 게시합니다.',
  'Emprint는 워크스페이스 생성 시 Pages 빌드 소스를 **GitHub Actions**로 자동 설정합니다. 자동 설정이 실패하면 저장소 **Settings → Pages**에서 빌드 소스를 **GitHub Actions**로 직접 변경하세요.',
  '',
  'Emprint GitHub 로그인 시 OAuth 범위 **`repo`**, **`workflow`**, **`delete_repo`**를 승인해야 합니다.'
].join('\n')

const readmePagesDeployEn = [
  '## GitHub Pages (automatic)',
  '',
  'This repo includes `.github/workflows/deploy-astro-gh-pages.yml`. Pushes to `main` build Astro and publish to Pages.',
  "Emprint configures the Pages build source to **GitHub Actions** automatically when the workspace is created. If that step fails (token lacks scope, org policy, etc.), open the repo's **Settings → Pages** and switch the build source to **GitHub Actions** manually.",
  '',
  "Emprint's GitHub sign-in must approve **`repo`**, **`workflow`**, and **`delete_repo`** OAuth scopes."
].join('\n')

/** Astro framework skeleton + CI wiring. Kind-agnostic. */
export function astroSharedArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  return [
    {
      relativePath: 'package.json',
      content:
        JSON.stringify(
          {
            name: 'emprint-site',
            type: 'module',
            version: '0.0.1',
            private: true,
            scripts: {
              // sync-assets mirrors the workspace `assets/` folder into Astro's
              // `public/assets/` so markdown references like /assets/foo.png
              // resolve at both dev and build time without copying images by
              // hand.
              predev: 'node ./scripts/sync-assets.mjs',
              prebuild: 'node ./scripts/sync-assets.mjs',
              dev: 'astro dev',
              build: 'astro build',
              preview: 'astro preview'
            },
            dependencies: {
              astro: '^6.3.1'
            }
          },
          null,
          2
        ) + '\n'
    },
    {
      relativePath: 'astro.config.mjs',
      content: `import { defineConfig } from 'astro/config'

// site / base are populated by the deploy workflow via \`actions/configure-pages\`,
// which exports them as GHP_SITE / GHP_BASE. Locally these are empty, so Astro
// falls back to root-served URLs and \`astro dev\` works without configuration.
// For project pages (https://user.github.io/<repo>/) base will be "/<repo>/";
// for user/org pages it will be "/". Both are fine for Astro's BASE_URL.
const site = process.env.GHP_SITE || undefined
const base = process.env.GHP_BASE || undefined

export default defineConfig({
  site,
  base,
  // Generate static HTML — the workflow uploads the resulting \`dist/\` to Pages.
  output: 'static',
  // Astro will emit \`posts/foo/index.html\` for routes like \`/posts/foo/\`,
  // which is what GitHub Pages serves cleanly without rewrites. Internal links
  // therefore consistently use a trailing slash too.
  trailingSlash: 'always',
  compressHTML: true
})
`
    },
    {
      relativePath: 'tsconfig.json',
      content:
        JSON.stringify(
          {
            extends: 'astro/tsconfigs/strict',
            compilerOptions: {
              baseUrl: '.'
            },
            include: ['src/**/*', 'src/env.d.ts']
          },
          null,
          2
        ) + '\n'
    },
    {
      relativePath: 'src/env.d.ts',
      content: `/// <reference types="astro/client" />\n`
    },
    {
      // Content collection for `posts/`. v5+ content layer with the glob
      // loader lets us point at an arbitrary directory outside src/, which
      // matches emprint's model where markdown lives at the workspace root.
      relativePath: 'src/content.config.ts',
      content: `import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const posts = defineCollection({
  // The base path is resolved from the astro.config.mjs location, i.e. the
  // workspace root. Drafts are not loaded into a separate collection; the
  // \`draft\` flag is filtered at the page level.
  loader: glob({ pattern: '*.md', base: './posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional()
  })
})

export const collections = { posts }
`
    },
    {
      // Tiny ESM script that mirrors workspace `assets/` into `public/assets/`.
      // We use it as a pre-hook for dev and build so users never see broken
      // image URLs during their first build.
      relativePath: 'scripts/sync-assets.mjs',
      content: `import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const src = path.join(root, 'assets')
const dest = path.join(root, 'public', 'assets')

if (!existsSync(src)) {
  // Nothing to mirror yet — make sure the source folder exists so future
  // \`emprint\` writes have a home.
  await mkdir(src, { recursive: true })
}

if (existsSync(dest)) {
  await rm(dest, { recursive: true, force: true })
}
await mkdir(path.dirname(dest), { recursive: true })
await cp(src, dest, { recursive: true })

const rel = path.relative(root, src)
const relDest = path.relative(root, dest)
console.log(\`[emprint] synced assets: \${rel} → \${relDest}\`)
`
    },
    {
      relativePath: 'public/robots.txt',
      content: 'User-agent: *\nAllow: /\n'
    },
    {
      relativePath: 'public/favicon.svg',
      content:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#0f1115"/><path d="M8 22V10l6 8 6-8v12" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n'
    },
    {
      relativePath: '.github/workflows/deploy-astro-gh-pages.yml',
      content: ghPagesWorkflowYaml
    },
    {
      relativePath: 'README.site.md',
      content:
        lang === 'ko'
          ? [
              '# Astro 사이트 (GitHub Pages)',
              '',
              '워크스페이스 루트에서:',
              '',
              '```bash',
              'npm install',
              'npm run dev',
              '```',
              '',
              '프로덕션 빌드:',
              '',
              '```bash',
              'npm run build',
              '```',
              '',
              'GitHub **Project** 사이트(`user.github.io/repo/`)는 base 경로가 필요합니다:',
              '',
              '```bash',
              'GHP_SITE=https://YOURNAME.github.io GHP_BASE=/YOUR-REPO/ npm run build',
              '```',
              '',
              '글은 워크스페이스 루트의 `posts/` 폴더에서 가져옵니다. Emprint에서 작성한 마크다운은 자동으로 사이트에 반영됩니다.',
              '',
              '`drafts/`는 git이 무시하므로 사이트에도 포함되지 않습니다.',
              '',
              '`assets/`의 이미지는 빌드 시 `public/assets/`로 자동 동기화됩니다. 마크다운에서는 `/assets/images/foo.png` 처럼 절대 경로로 참조하세요.',
              '',
              readmePagesDeployKo
            ].join('\n')
          : [
              '# Astro site (GitHub Pages)',
              '',
              'From the workspace root:',
              '',
              '```bash',
              'npm install',
              'npm run dev',
              '```',
              '',
              'Production build:',
              '',
              '```bash',
              'npm run build',
              '```',
              '',
              'For a GitHub **Project** site (`user.github.io/repo/`) set base when building:',
              '',
              '```bash',
              'GHP_SITE=https://YOURNAME.github.io GHP_BASE=/YOUR-REPO/ npm run build',
              '```',
              '',
              'Posts come from the workspace `posts/` folder. Markdown written in Emprint shows up on the site automatically.',
              '',
              '`drafts/` is gitignored and is therefore excluded from the site.',
              '',
              'Images under `assets/` are synced into `public/assets/` at build time. Reference them with absolute paths like `/assets/images/foo.png`.',
              '',
              readmePagesDeployEn
            ].join('\n')
    }
  ]
}

/* ---------------------------------------------------------------------- */
/*                               LAYOUTS                                  */
/* ---------------------------------------------------------------------- */

/**
 * Visual shell: site-wide layout, header, footer, post card, global stylesheet.
 * Designed to be lightweight and easy for users to fork — no CSS framework,
 * a small palette driven by CSS custom properties, and a single typeface
 * stack covering Korean + Latin.
 */
export function astroBlogLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const titleJson = JSON.stringify(ctx.title)
  const descriptionJson = JSON.stringify(ctx.description)

  return [
    {
      relativePath: 'src/styles/global.css',
      content: `:root {
  --bg: #faf8f4;
  --surface: #ffffff;
  --ink: #181715;
  --muted: #6c6962;
  --rule: #e8e4dc;
  --accent: #c4713f;
  --accent-soft: rgba(196, 113, 63, 0.12);
  --font-sans: ui-sans-serif, system-ui, 'Inter', 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  --font-serif: 'Iowan Old Style', 'Source Serif Pro', 'Noto Serif KR', Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace;
  --measure: 38rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14130f;
    --surface: #1a1814;
    --ink: #f1ece2;
    --muted: #948d80;
    --rule: #2a261f;
    --accent: #e08a4a;
    --accent-soft: rgba(224, 138, 74, 0.14);
  }
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  line-height: 1.6;
}

a {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 120ms ease, color 120ms ease;
}
a:hover { border-bottom-color: var(--accent); color: var(--accent); }

img, video { max-width: 100%; height: auto; display: block; }

main { flex: 1 1 auto; }

.container {
  width: 100%;
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 1.25rem;
}

.wide {
  width: 100%;
  max-width: 56rem;
  margin: 0 auto;
  padding: 0 1.25rem;
}

.muted { color: var(--muted); }

.eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}

.title {
  font-family: var(--font-serif);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.18;
  color: var(--ink);
  margin: 0;
}

/* ---------------- Post list / cards ---------------- */
.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.post-list > li + li { border-top: 1px solid var(--rule); }

.post-card {
  display: block;
  padding: 1.5rem 0;
  border-bottom: 1px solid transparent;
}
.post-card:hover { border-bottom-color: transparent; }
.post-card-title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0;
}
.post-card-meta {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.post-card-desc {
  margin-top: 0.65rem;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.65;
}

/* ---------------- Tag pills ---------------- */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  border-bottom: none;
}
.tag:hover { color: var(--accent); border-bottom: none; }
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
}

/* ---------------- Header / Footer ---------------- */
.site-header {
  border-bottom: 1px solid var(--rule);
  background: var(--bg);
}
.site-header-inner {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem 0 1.25rem;
}
.site-brand {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 1.15rem;
  letter-spacing: -0.01em;
  color: var(--ink);
  border-bottom: none;
}
.site-brand:hover { color: var(--accent); border-bottom: none; }
.site-tagline {
  margin: 0.15rem 0 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.site-nav {
  display: flex;
  gap: 1.25rem;
  font-size: 0.92rem;
}
.site-nav a { color: var(--muted); border-bottom: none; }
.site-nav a:hover { color: var(--accent); border-bottom: none; }
.site-nav a[aria-current='page'] { color: var(--ink); }

.site-footer {
  border-top: 1px solid var(--rule);
  margin-top: 4rem;
  padding: 1.75rem 0 2rem;
  color: var(--muted);
  font-size: 0.82rem;
}
.site-footer-inner {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* ---------------- Article (post detail) typography ---------------- */
.prose {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--ink);
}
.prose > * + * { margin-top: 1.1rem; }
.prose h1, .prose h2, .prose h3 {
  font-family: var(--font-serif);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  margin-top: 2rem;
}
.prose h1 { font-size: 1.65rem; }
.prose h2 { font-size: 1.35rem; }
.prose h3 { font-size: 1.15rem; }
.prose p, .prose ul, .prose ol, .prose pre, .prose blockquote { margin: 0; }
.prose ul, .prose ol { padding-left: 1.25rem; }
.prose blockquote {
  border-left: 3px solid var(--accent);
  padding: 0.25rem 0 0.25rem 1rem;
  color: var(--muted);
  font-style: italic;
}
.prose hr { border: none; border-top: 1px solid var(--rule); margin: 2rem 0; }
.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0.1em 0.35em;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 4px;
}
.prose pre {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.55;
  padding: 1rem 1.1rem;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow-x: auto;
}
.prose pre code {
  padding: 0;
  background: transparent;
  color: inherit;
  font-size: inherit;
}
.prose img {
  border-radius: 8px;
  border: 1px solid var(--rule);
}

.post-header {
  margin: 2.5rem 0 2rem;
}
.post-header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.75rem;
}
.post-header-title {
  font-family: var(--font-serif);
  font-size: 2.1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0;
  color: var(--ink);
}
.post-header-desc {
  margin: 0.75rem 0 0;
  color: var(--muted);
  font-size: 1.02rem;
  line-height: 1.6;
}

/* ---------------- Section heads ---------------- */
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin: 2.5rem 0 1rem;
}
.section-head h2 {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
  color: var(--ink);
}
.section-head .see-all {
  font-size: 0.85rem;
  color: var(--muted);
  border-bottom: none;
}
.section-head .see-all:hover { color: var(--accent); }

/* ---------------- Empty state ---------------- */
.empty {
  padding: 3rem 1.25rem;
  text-align: center;
  color: var(--muted);
  font-size: 0.95rem;
  border: 1px dashed var(--rule);
  border-radius: 10px;
  background: var(--surface);
}
`
    },
    {
      relativePath: 'src/lib/site.ts',
      content: `// Site-level constants. The config/site.json file in the workspace is the
// source of truth, but we read it via a normal import so changes are
// reflected at build time without extra plumbing.
import siteConfig from '../../config/site.json'

export interface SiteConfig {
  title: string
  description: string
  themeColor?: string
  layoutStyle?: string
}

const config = siteConfig as SiteConfig

export const SITE_TITLE = config.title || ${titleJson}
export const SITE_DESCRIPTION = config.description || ${descriptionJson}
export const SITE_LANG = '${lang}'

export function formatDate(input?: Date): string {
  if (!input) return ''
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('${lang === 'ko' ? 'ko-KR' : 'en-US'}', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
`
    },
    {
      relativePath: 'src/components/Header.astro',
      content: `---
import { SITE_TITLE, SITE_DESCRIPTION } from '../lib/site'

interface Props {
  current?: 'home' | 'archive' | 'tags'
}

const { current } = Astro.props
---

<header class="site-header">
  <div class="wide site-header-inner">
    <div>
      <a class="site-brand" href={\`\${import.meta.env.BASE_URL}\`}>{SITE_TITLE}</a>
      <p class="site-tagline">{SITE_DESCRIPTION}</p>
    </div>
    <nav class="site-nav" aria-label="${lang === 'ko' ? '주요 메뉴' : 'Primary'}">
      <a href={\`\${import.meta.env.BASE_URL}\`} aria-current={current === 'home' ? 'page' : undefined}>
        ${lang === 'ko' ? '홈' : 'Home'}
      </a>
      <a href={\`\${import.meta.env.BASE_URL}posts/\`} aria-current={current === 'archive' ? 'page' : undefined}>
        ${lang === 'ko' ? '아카이브' : 'Archive'}
      </a>
      <a href={\`\${import.meta.env.BASE_URL}tags/\`} aria-current={current === 'tags' ? 'page' : undefined}>
        ${lang === 'ko' ? '태그' : 'Tags'}
      </a>
    </nav>
  </div>
</header>
`
    },
    {
      relativePath: 'src/components/Footer.astro',
      content: `---
import { SITE_TITLE } from '../lib/site'
const year = new Date().getFullYear()
---

<footer class="site-footer">
  <div class="wide site-footer-inner">
    <span>© {year} {SITE_TITLE}</span>
    <span>${lang === 'ko' ? 'Emprint로 발행됨' : 'Published with Emprint'}</span>
  </div>
</footer>
`
    },
    {
      relativePath: 'src/components/PostCard.astro',
      content: `---
import type { CollectionEntry } from 'astro:content'
import { formatDate } from '../lib/site'

interface Props {
  post: CollectionEntry<'posts'>
}

const { post } = Astro.props
const date = post.data.updatedAt ?? post.data.createdAt
const href = \`\${import.meta.env.BASE_URL}posts/\${post.id}/\`
---

<li>
  <a class="post-card" href={href}>
    <h3 class="post-card-title">{post.data.title}</h3>
    <div class="post-card-meta">
      {date ? <span>{formatDate(date)}</span> : null}
      {post.data.tags.length > 0 ? (
        <>
          <span aria-hidden> · </span>
          <ul class="tag-row" style="list-style:none;padding:0;margin:0;display:inline-flex;">
            {post.data.tags.slice(0, 4).map((t: string) => (
              <li><span class="tag">{t}</span></li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
    {post.data.description ? <p class="post-card-desc">{post.data.description}</p> : null}
  </a>
</li>
`
    },
    {
      relativePath: 'src/layouts/Layout.astro',
      content: `---
import '../styles/global.css'
import Header from '../components/Header.astro'
import Footer from '../components/Footer.astro'
import { SITE_LANG, SITE_TITLE, SITE_DESCRIPTION } from '../lib/site'

interface Props {
  title?: string
  description?: string
  current?: 'home' | 'archive' | 'tags'
}

const { title, description, current } = Astro.props
const fullTitle = title ? \`\${title} · \${SITE_TITLE}\` : SITE_TITLE
const meta = description ?? SITE_DESCRIPTION
---

<!DOCTYPE html>
<html lang={SITE_LANG}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={meta} />
    <link rel="icon" type="image/svg+xml" href={\`\${import.meta.env.BASE_URL}favicon.svg\`} />
    <title>{fullTitle}</title>
    <slot name="head" />
  </head>
  <body>
    <Header current={current} />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
`
    },
    {
      relativePath: 'src/layouts/PostLayout.astro',
      content: `---
import Layout from './Layout.astro'
import { formatDate } from '../lib/site'

interface Props {
  title: string
  description?: string
  tags?: string[]
  createdAt?: Date
  updatedAt?: Date
}

const { title, description, tags = [], createdAt, updatedAt } = Astro.props
const date = updatedAt ?? createdAt
---

<Layout title={title} description={description}>
  <article class="container">
    <header class="post-header">
      <div class="post-header-meta">
        {date ? <span>{formatDate(date)}</span> : null}
        {tags.length > 0 ? (
          <ul class="tag-row" style="list-style:none;padding:0;margin:0;display:inline-flex;">
            {tags.map((t: string) => (
              <li>
                <a class="tag" href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(t)}/\`}>{t}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <h1 class="post-header-title">{title}</h1>
      {description ? <p class="post-header-desc">{description}</p> : null}
    </header>

    <div class="prose">
      <slot />
    </div>
  </article>
</Layout>
`
    }
  ]
}

/* ---------------------------------------------------------------------- */
/*                                PAGES                                   */
/* ---------------------------------------------------------------------- */

/**
 * Build all the pages that make up the blog "column" experience:
 *   /                 → recent posts + intro
 *   /posts/           → full archive
 *   /posts/[slug]/    → post detail
 *   /tags/            → tag index
 *   /tags/[tag]/      → posts filtered by tag
 *
 * Pages are kept thin: heavy lifting (querying, filtering, formatting) lives
 * in `src/lib/site.ts` and Astro content collections.
 */
export function astroBlogPageArtifacts(_ctx: SiteGenerationContext): WorkspaceArtifact[] {
  return [
    {
      relativePath: 'src/pages/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../layouts/Layout.astro'
import PostCard from '../components/PostCard.astro'

const all = await getCollection('posts', ({ data }) => !data.draft)
const sorted = all.sort((a, b) => {
  const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
  const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
  return bd - ad
})
const recent = sorted.slice(0, 5)
const hasMore = sorted.length > recent.length
---

<Layout current="home">
  <section class="container">
    <div class="section-head">
      <h2>Recent</h2>
      {hasMore ? (
        <a class="see-all" href={\`\${import.meta.env.BASE_URL}posts/\`}>See all →</a>
      ) : null}
    </div>
    {recent.length === 0 ? (
      <div class="empty">No posts yet. Write something in Emprint and publish.</div>
    ) : (
      <ul class="post-list">
        {recent.map((post) => <PostCard post={post} />)}
      </ul>
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/posts/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import PostCard from '../../components/PostCard.astro'

const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort((a, b) => {
  const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
  const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
  return bd - ad
})
---

<Layout title="Archive" current="archive">
  <section class="container">
    <div class="section-head">
      <h2>Archive</h2>
      <span class="muted">{posts.length}</span>
    </div>
    {posts.length === 0 ? (
      <div class="empty">No posts yet.</div>
    ) : (
      <ul class="post-list">
        {posts.map((post) => <PostCard post={post} />)}
      </ul>
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/posts/[...slug].astro',
      content: `---
import { getCollection, render } from 'astro:content'
import PostLayout from '../../layouts/PostLayout.astro'

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post }
  }))
}

const { post } = Astro.props
const { Content } = await render(post)
---

<PostLayout
  title={post.data.title}
  description={post.data.description}
  tags={post.data.tags}
  createdAt={post.data.createdAt}
  updatedAt={post.data.updatedAt}
>
  <Content />
</PostLayout>
`
    },
    {
      relativePath: 'src/pages/tags/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'

const posts = await getCollection('posts', ({ data }) => !data.draft)
const counts = new Map<string, number>()
for (const post of posts) {
  for (const tag of post.data.tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
}
const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
---

<Layout title="Tags" current="tags">
  <section class="container">
    <div class="section-head">
      <h2>Tags</h2>
      <span class="muted">{tags.length}</span>
    </div>
    {tags.length === 0 ? (
      <div class="empty">No tags yet. Add some in your post frontmatter.</div>
    ) : (
      <ul class="tag-row" style="padding:0.5rem 0;">
        {tags.map(([tag, count]) => (
          <li>
            <a class="tag" href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(tag)}/\`}>
              {tag} · {count}
            </a>
          </li>
        ))}
      </ul>
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/tags/[tag].astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import PostCard from '../../components/PostCard.astro'

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  const tagSet = new Set<string>()
  for (const p of posts) for (const t of p.data.tags) tagSet.add(t)
  return [...tagSet].map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter((p) => p.data.tags.includes(tag))
        .sort((a, b) => {
          const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
          const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
          return bd - ad
        })
    }
  }))
}

const { tag, posts } = Astro.props
---

<Layout title={\`#\${tag}\`} current="tags">
  <section class="container">
    <div class="section-head">
      <h2>#{tag}</h2>
      <span class="muted">{posts.length}</span>
    </div>
    <ul class="post-list">
      {posts.map((post: any) => <PostCard post={post} />)}
    </ul>
  </section>
</Layout>
`
    }
  ]
}

/* ---------------------------------------------------------------------- */
/*                          SHOWCASE (legacy)                             */
/* ---------------------------------------------------------------------- */

/**
 * Showcase kind is intentionally left on its old single-page layout for now.
 * The blog (column) kind owns the modern boilerplate above.
 */
export function showcaseDataJson(ctx: SiteGenerationContext): WorkspaceArtifact {
  const data = [
    {
      slug: 'welcome',
      title: ctx.title,
      summary: ctx.description,
      href: '#'
    }
  ]
  return {
    relativePath: 'src/data/projects.json',
    content: JSON.stringify(data, null, 2)
  }
}

export function showcaseIndexPage(ctx: SiteGenerationContext): WorkspaceArtifact {
  const lang = ctx.locale === 'ko' ? 'ko' : 'en'
  const projectsLabel = ctx.locale === 'ko' ? '프로젝트' : 'Projects'
  const aboutLabel = ctx.locale === 'ko' ? '소개' : 'About'
  const aboutBody =
    ctx.locale === 'ko'
      ? 'Showcase 템플릿입니다. src/data/projects.json 을 편집해 카드를 바꿀 수 있습니다.'
      : 'Showcase template. Edit src/data/projects.json to change cards.'

  return {
    relativePath: 'src/pages/index.astro',
    content: `---
import Layout from '../layouts/Layout.astro'
import projects from '../data/projects.json'

const pageTitle = ${JSON.stringify(ctx.title)}
const pageDescription = ${JSON.stringify(ctx.description)}
---

<Layout title={pageTitle} description={pageDescription} lang="${lang}">
  <header style="padding:3rem 1.5rem 2rem;text-align:center;border-bottom:1px solid #22252b;background:#0f1115;color:#f3f4f6;font-family:system-ui,sans-serif;">
    <h1 style="margin:0 0 .5rem;font-size:2rem;">{pageTitle}</h1>
    <p style="margin:0;color:#9ca3af;max-width:36rem;margin-inline:auto;">{pageDescription}</p>
  </header>
  <section style="max-width:48rem;margin:0 auto;padding:2rem 1.5rem;font-family:system-ui,sans-serif;background:#0f1115;color:#f3f4f6;">
    <h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.12em;color:#cd7b00;margin-bottom:1rem;">${aboutLabel}</h2>
    <p style="color:#9ca3af;margin:0;">${aboutBody}</p>
  </section>
  <section style="max-width:48rem;margin:0 auto;padding:0 1.5rem 4rem;font-family:system-ui,sans-serif;background:#0f1115;color:#f3f4f6;">
    <h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:.12em;color:#cd7b00;margin-bottom:1rem;">${projectsLabel}</h2>
    <div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));">
      {projects.map((p) => (
        <article style="border:1px solid #22252b;border-radius:.5rem;padding:1rem 1.1rem;background:#14171c;">
          <h3 style="margin:0 0 .35rem;font-size:1.05rem;">{p.title}</h3>
          <p style="margin:0;font-size:.9rem;color:#9ca3af;">{p.summary}</p>
          <p style="margin-top:.6rem;"><a href={p.href} style="color:#f97316;text-decoration:none;">Link</a></p>
        </article>
      ))}
    </div>
  </section>
</Layout>
`
  }
}
