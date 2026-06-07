import type { WorkspaceArtifact } from '@emprint/core'
import { EpDictionaryClasses } from './contract'
import { createColumnPagefindScriptArtifact } from '../column/column-search-artifacts'

export { createColumnPagefindScriptArtifact as createDictionaryPagefindScriptArtifact }

export function createDictionarySearchPageArtifact(lang: 'ko' | 'en'): WorkspaceArtifact {
  const C = EpDictionaryClasses
  const title = lang === 'ko' ? '검색' : 'Search'
  const heading = lang === 'ko' ? '지식 검색' : 'Search knowledge'
  const hint =
    lang === 'ko'
      ? '제목, 설명, 태그, 인덱스, 본문에서 키워드를 찾습니다.'
      : 'Find keywords in titles, descriptions, tags, index paths, and body text.'

  return {
    relativePath: 'src/pages/search/index.astro',
    content: `---
import Layout from '../../layouts/Layout.astro'

const q = Astro.url.searchParams.get('q') ?? ''
---

<Layout title="${title}" current="search">
  <link slot="head" href={\`\${import.meta.env.BASE_URL}pagefind/pagefind-ui.css\`} rel="stylesheet" />
  <section class="${C.Container}">
    <div class="${C.SectionHead}">
      <h2 class="${C.SectionHeadTitle}">${heading}</h2>
    </div>
    <p class="${C.Muted}" style="margin:0 0 1rem;font-size:0.9rem;">${hint}</p>
    <div id="pagefind-search" class="${C.Search}"></div>
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
          '<p class="${C.Empty}">Search index not found. Run <code>npm run build</code> first.</p>'
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
        '<p class="${C.Empty}">Search is unavailable until the site is built with Pagefind.</p>'
    }
  }

  initPagefindSearch()
</script>
`
  }
}
