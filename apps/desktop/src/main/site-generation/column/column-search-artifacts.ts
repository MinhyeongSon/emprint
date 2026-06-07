import type { WorkspaceArtifact } from '@emprint/core'
import { EpColumnClasses } from './contract'

/** Pagefind CLI wrapper — runs after `astro build` (respects GHP_BASE for project Pages). */
export function createColumnPagefindScriptArtifact(): WorkspaceArtifact {
  return {
    relativePath: 'scripts/build-pagefind.mjs',
    content: `import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

if (!existsSync(dist)) {
  console.warn('[emprint] pagefind skipped: dist/ not found')
  process.exit(0)
}

const base = process.env.GHP_BASE || '/'
const args = ['pagefind', '--site', dist]
if (base && base !== '/') {
  const normalized = base.endsWith('/') ? base : \`\${base}/\`
  args.push('--base-url', normalized)
}

const result = spawnSync('npx', args, { stdio: 'inherit', cwd: root, shell: true })
if (result.status !== 0) {
  console.warn('[emprint] pagefind exited with code', result.status ?? 1)
}
process.exit(result.status ?? 0)
`
  }
}

export function createColumnSearchPageArtifact(lang: 'ko' | 'en'): WorkspaceArtifact {
  const title = lang === 'ko' ? '검색' : 'Search'
  const heading = lang === 'ko' ? '글 검색' : 'Search posts'
  const hint =
    lang === 'ko'
      ? '제목, 설명, 태그, 본문에서 키워드를 찾습니다.'
      : 'Find keywords in titles, descriptions, tags, and body text.'

  return {
    relativePath: 'src/pages/search/index.astro',
    content: `---
import Layout from '../../layouts/Layout.astro'

const q = Astro.url.searchParams.get('q') ?? ''
---

<Layout title="${title}" current="search">
  <link slot="head" href={\`\${import.meta.env.BASE_URL}pagefind/pagefind-ui.css\`} rel="stylesheet" />
  <section class="${EpColumnClasses.Container}">
    <div class="${EpColumnClasses.SectionHead}">
      <h2 class="${EpColumnClasses.SectionHeadTitle}">${heading}</h2>
    </div>
    <p class="${EpColumnClasses.Muted}" style="margin:0 0 1rem;font-size:0.9rem;">${hint}</p>
    <div id="pagefind-search" class="${EpColumnClasses.Search}"></div>
  </section>
</Layout>

<script define:vars={{ baseUrl: import.meta.env.BASE_URL, initialQuery: q }}>
  async function initPagefindSearch() {
    const target = document.getElementById('pagefind-search')
    if (!target) return

    try {
      const uiModule = await import(\`\${baseUrl}pagefind/pagefind-ui.js\`)
      const PagefindUI = uiModule.PagefindUI ?? uiModule.default?.PagefindUI
      if (!PagefindUI) {
        target.innerHTML =
          '<p class="${EpColumnClasses.Empty}">Search index not found. Run <code>npm run build</code> first.</p>'
        return
      }

      const ui = new PagefindUI({
        element: '#pagefind-search',
        baseUrl,
        showSubResults: true,
        resetStyles: false
      })

      if (initialQuery.trim()) {
        ui.triggerSearch(initialQuery.trim())
      }
    } catch (err) {
      console.error('[emprint] pagefind init failed', err)
      target.innerHTML =
        '<p class="${EpColumnClasses.Empty}">Search is unavailable until the site is built with Pagefind.</p>'
    }
  }

  initPagefindSearch()
</script>
`
  }
}
