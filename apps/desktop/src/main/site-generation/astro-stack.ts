import type { WorkspaceArtifact } from '../workspace/workspace-template'
import type { SiteGenerationContext } from './site-project-generator'
import { createColumnLayoutArtifacts } from './column/column-layout-artifacts'

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
              'sync:theme': 'node ./scripts/sync-theme.mjs',
              'sync:assets': 'node ./scripts/sync-assets.mjs',
              predev: 'npm run sync:theme && npm run sync:assets',
              prebuild: 'npm run sync:theme && npm run sync:assets',
              'theme:sync': 'npm run sync:theme',
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
  server: {
    port: 4321,
    strictPort: false
  },
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
/** Column anthology visual shell (theme.json + ep-column-* components). */
export function astroBlogLayoutArtifacts(ctx: SiteGenerationContext): WorkspaceArtifact[] {
  return createColumnLayoutArtifacts(ctx)
}


export function astroBlogPageArtifacts(_ctx: SiteGenerationContext): WorkspaceArtifact[] {
  return []
}
