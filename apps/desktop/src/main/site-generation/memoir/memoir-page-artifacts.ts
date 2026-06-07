import type { WorkspaceArtifact } from '@emprint/core'
import { EpMemoirClasses as C } from './contract'

function memoirAssetHelperFrontmatter(): string {
  return `
function memoirAssetSrc(raw: unknown) {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  const clean = raw.trim().replace(/^\\/+/, '')
  if (!clean) return ''
  if (clean.startsWith('assets/')) return \`/\${clean}\`
  return \`/\${clean}\`
}
`
}

function memoirHeroImageMarkup(propsVar: string): string {
  return `{memoirAssetSrc(${propsVar}.image) ? (
        <figure class="${C.HeroFigure}">
          <img src={memoirAssetSrc(${propsVar}.image)} alt="" loading="lazy" class="${C.HeroImage}" />
        </figure>
      ) : null}`
}

function memoirProjectFieldsMarkup(propsVar: string, titleTag: 'h2' | 'h3'): string {
  return `{${propsVar}.period ? <p class="${C.ProjectMeta}"><time>{String(${propsVar}.period)}</time></p> : null}
      {memoirAssetSrc(${propsVar}.image) ? (
        <figure class="${C.ProjectFigure}">
          <img src={memoirAssetSrc(${propsVar}.image)} alt={String(${propsVar}.title ?? '')} loading="lazy" class="${C.ProjectImage}" />
        </figure>
      ) : null}
      <${titleTag} class="${C.ProjectTitle}">{String(${propsVar}.title ?? '')}</${titleTag}>
      {${propsVar}.role ? <p class="${C.ProjectMeta}">{String(${propsVar}.role)}</p> : null}
      {${propsVar}.body ? <MemoirRichText text={String(${propsVar}.body)} class="${C.ProjectBody}" /> : null}
      {${propsVar}.link ? (
        <p class="${C.ProjectLink}">
          <a href={String(${propsVar}.link)} rel="noopener noreferrer">{String(${propsVar}.title ?? 'View project')}</a>
        </p>
      ) : null}`
}

function memoirIntroductionTimelineMarkup(propsVar: string): string {
  return `{${propsVar}.period ? <p class="${C.TimelinePeriod}">{String(${propsVar}.period)}</p> : null}
                  {${propsVar}.title ? <h3 class="${C.IntroductionTitle}">{String(${propsVar}.title)}</h3> : null}
                  {${propsVar}.body ? <MemoirRichText text={String(${propsVar}.body)} class="${C.IntroductionBody}" /> : null}`
}

function memoirContactLinksMarkup(propsVar: string): string {
  return `{Array.isArray(${propsVar}.links) && ${propsVar}.links.length > 0 ? (
        <ul class="${C.ContactLinks}">
          {${propsVar}.links.map((link: { label?: string; url?: string }) =>
            link && typeof link === 'object' && link.url ? (
              <li>
                <a href={String(link.url)} rel="noopener noreferrer">
                  {String(link.label || link.url)}
                </a>
              </li>
            ) : null
          )}
        </ul>
      ) : null}`
}

const MEMOIR_PAGE_SYNC_PATHS = new Set([
  'src/pages/index.astro',
  'src/components/MemoirSection.astro',
  'src/components/MemoirEditorialLead.astro'
])

export function getMemoirPageTemplateSyncArtifacts(): WorkspaceArtifact[] {
  return createMemoirPageArtifacts().filter((a) => MEMOIR_PAGE_SYNC_PATHS.has(a.relativePath))
}

export function createMemoirPageArtifacts(): WorkspaceArtifact[] {
  return [
    {
      relativePath: 'src/components/MemoirEditorialLead.astro',
      content: memoirEditorialLeadAstro()
    },
    {
      relativePath: 'src/components/MemoirSection.astro',
      content: memoirSectionAstro()
    },
    {
      relativePath: 'src/pages/index.astro',
      content: indexAstro()
    }
  ]
}

function memoirEditorialLeadAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import MemoirRichText from './MemoirRichText.astro'
${memoirAssetHelperFrontmatter()}

interface Props {
  hero: CollectionEntry<'sections'>
  quote: CollectionEntry<'sections'>
}

const { hero, quote } = Astro.props
const hp = hero.data.props
const qp = quote.data.props
---

<section class="${C.Section} ${C.EditorialLead}" id={hero.data.id}>
  <div class="${C.SectionInner} ${C.Container}">
    <div class="${C.EditorialLeadHero}">
      {hp.eyebrow ? <p class="${C.Eyebrow}">{String(hp.eyebrow)}</p> : null}
      ${memoirHeroImageMarkup('hp')}
      <h1 class="${C.HeroTitle}">{String(hp.title ?? '')}</h1>
      {hp.subtitle ? <p class="${C.HeroSubtitle}">{String(hp.subtitle)}</p> : null}
    </div>
    <aside class="${C.EditorialLeadQuote}" id={quote.data.id}>
      {qp.body ? <MemoirRichText text={String(qp.body)} class="${C.QuoteBody}" as="blockquote" /> : null}
      {qp.attribution ? <p class="${C.QuoteAttribution}">— {String(qp.attribution)}</p> : null}
    </aside>
  </div>
</section>
`
}

function memoirSectionAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import MemoirRichText from './MemoirRichText.astro'
${memoirAssetHelperFrontmatter()}

type Composition = 'timeline' | 'grid' | 'editorial'

interface Props {
  entry: CollectionEntry<'sections'>
  byId: Map<string, CollectionEntry<'sections'>>
  composition: Composition
}

const { entry, byId, composition } = Astro.props
const { type, props: p, children = [] } = entry.data
const isGrid = composition === 'grid'
---

{type === 'Hero' ? (
  composition === 'editorial' ? null : (
    <section class="${C.Section} ${C.Hero}" id={entry.data.id}>
      <div class="${C.SectionInner} ${C.Container}">
        {p.eyebrow ? <p class="${C.Eyebrow}">{String(p.eyebrow)}</p> : null}
        ${memoirHeroImageMarkup('p')}
        <h1 class="${C.HeroTitle}">{String(p.title ?? '')}</h1>
        {p.subtitle ? <p class="${C.HeroSubtitle}">{String(p.subtitle)}</p> : null}
      </div>
    </section>
  )
) : type === 'Quote' ? (
  composition === 'editorial' ? null : (
    <section class="${C.Section} ${C.Quote}" id={entry.data.id}>
      <div class="${C.SectionInner} ${C.Container}">
        {p.body ? <MemoirRichText text={String(p.body)} class="${C.QuoteBody}" as="blockquote" /> : null}
        {p.attribution ? <p class="${C.QuoteAttribution}">— {String(p.attribution)}</p> : null}
      </div>
    </section>
  )
) : type === 'Introduction' ? (
  <section class="${C.Section} ${C.Introduction}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      {p.period ? <p class="${C.TimelinePeriod}">{String(p.period)}</p> : null}
      {p.title ? <h2 class="${C.IntroductionTitle}">{String(p.title)}</h2> : null}
      {p.body ? <MemoirRichText text={String(p.body)} class="${C.IntroductionBody}" /> : null}
    </div>
  </section>
) : type === 'Project' ? (
  <section class="${C.Section} ${C.Project}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      <div class={isGrid ? '${C.ProjectMasonry}' : '${C.ProjectStack}'}>
        <article class="${C.Project}">
          ${memoirProjectFieldsMarkup('p', 'h2')}
        </article>
      </div>
    </div>
  </section>
) : type === 'Skill' ? (
  <section class="${C.Section} ${C.Skill}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      <p class="${C.SkillName}">
        {String(p.name ?? '')}
        {p.level ? <span class="${C.SkillLevel}"> · {String(p.level)}</span> : null}
      </p>
    </div>
  </section>
) : type === 'ProjectGroup' ? (
  <section class="${C.Section} ${C.ProjectGroup}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      {p.title ? <h2 class="${C.ProjectGroupTitle}">{String(p.title)}</h2> : null}
      <div class={isGrid ? '${C.ProjectMasonry}' : '${C.ProjectStack}'}>
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child || child.data.type !== 'Project') return null
          const cp = child.data.props
          return (
            <article class="${C.Project}" id={child.data.id}>
              ${memoirProjectFieldsMarkup('cp', 'h3')}
            </article>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'SkillGroup' ? (
  <section class="${C.Section} ${C.SkillGroup}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      {p.title ? <h2 class="${C.SkillGroupTitle}">{String(p.title)}</h2> : null}
      <ul class="${C.SkillList}">
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child || child.data.type !== 'Skill') return null
          const cp = child.data.props
          return (
            <li class="${C.Skill}" id={child.data.id}>
              <span class="${C.SkillName}">{String(cp.name ?? '')}</span>
              {cp.level ? <span class="${C.SkillLevel}">{String(cp.level)}</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  </section>
) : type === 'Timeline' ? (
  <section class="${C.Section} ${C.Timeline}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      {p.title ? <h2 class="${C.TimelineTitle}">{String(p.title)}</h2> : null}
      <div class="${C.TimelineList}">
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child) return null
          const cp = child.data.props
          const ct = child.data.type
          return (
            <div class="${C.TimelineItem}" id={child.data.id}>
              {ct === 'Introduction' ? (
                <>
                  ${memoirIntroductionTimelineMarkup('cp')}
                </>
              ) : ct === 'Quote' ? (
                <>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${C.QuoteBody}" as="blockquote" /> : null}
                  {cp.attribution ? <p class="${C.QuoteAttribution}">— {String(cp.attribution)}</p> : null}
                </>
              ) : ct === 'Project' ? (
                <article class="${C.Project}">
                  ${memoirProjectFieldsMarkup('cp', 'h3')}
                </article>
              ) : ct === 'Skill' ? (
                <p class="${C.SkillName}">
                  {String(cp.name ?? '')}
                  {cp.level ? <span class="${C.SkillLevel}"> · {String(cp.level)}</span> : null}
                </p>
              ) : ct === 'Contact' ? (
                <>
                  {cp.title ? <h3 class="${C.ContactTitle}">{String(cp.title)}</h3> : null}
                  ${memoirContactLinksMarkup('cp')}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${C.ContactBody}" /> : null}
                </>
              ) : (
                <p class="${C.Muted}">{ct}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'Gallery' ? (
  <section class="${C.Section} ${C.Gallery}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      {p.title ? <h2 class="${C.GalleryTitle}">{String(p.title)}</h2> : null}
      <div class={isGrid ? '${C.ProjectMasonry}' : '${C.GalleryGrid}'}>
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child) return null
          const cp = child.data.props
          const ct = child.data.type
          const itemClass = isGrid && ct === 'Project' ? '${C.Project}' : '${C.GalleryItem}'
          return (
            <article class={itemClass} id={child.data.id}>
              {ct === 'Project' ? (
                <>
                  ${memoirProjectFieldsMarkup('cp', 'h3')}
                </>
              ) : ct === 'Introduction' ? (
                <>
                  {cp.period ? <p class="${C.TimelinePeriod}">{String(cp.period)}</p> : null}
                  {cp.title ? <h3 class="${C.IntroductionTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${C.IntroductionBody}" /> : null}
                </>
              ) : (
                <p class="${C.Muted}">{ct}</p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'Contact' ? (
  <section class="${C.Section} ${C.Contact}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      {p.title ? <h2 class="${C.ContactTitle}">{String(p.title)}</h2> : null}
      ${memoirContactLinksMarkup('p')}
      {p.body ? <MemoirRichText text={String(p.body)} class="${C.ContactBody}" /> : null}
    </div>
  </section>
) : (
  <section class="${C.Section}" id={entry.data.id}>
    <div class="${C.SectionInner} ${C.Container}">
      <p class="${C.Muted}">{type}</p>
    </div>
  </section>
)}
`
}

function indexAstro(): string {
  return `---
import { getCollection } from 'astro:content'
import Layout from '../layouts/Layout.astro'
import MemoirSection from '../components/MemoirSection.astro'
import MemoirEditorialLead from '../components/MemoirEditorialLead.astro'
import themeFile from '../../config/theme.json'

type Composition = 'timeline' | 'grid' | 'editorial'

function resolveComposition(raw: unknown): Composition {
  if (raw === 'grid' || raw === 'editorial' || raw === 'timeline') return raw
  return 'timeline'
}

const composition = resolveComposition(themeFile.layoutComposition)

const all = await getCollection('sections', ({ data }) => data.published)
const byId = new Map(all.map((e) => [e.data.id, e]))
const childIds = new Set(all.flatMap((e) => e.data.children ?? []))
const roots = all.filter((e) => !childIds.has(e.data.id)).sort((a, b) => a.data.order - b.data.order)

type PageBlock =
  | { kind: 'editorial-lead'; hero: (typeof roots)[number]; quote: (typeof roots)[number] }
  | { kind: 'section'; entry: (typeof roots)[number] }

const blocks: PageBlock[] = []
for (let i = 0; i < roots.length; i++) {
  const entry = roots[i]
  if (!entry) continue
  const next = roots[i + 1]
  if (composition === 'editorial' && entry.data.type === 'Hero' && next?.data.type === 'Quote') {
    blocks.push({ kind: 'editorial-lead', hero: entry, quote: next })
    i++
    continue
  }
  blocks.push({ kind: 'section', entry })
}
---

<Layout>
  <div class="${C.Page}" data-composition={composition}>
    {blocks.map((block) =>
      block.kind === 'editorial-lead' ? (
        <MemoirEditorialLead hero={block.hero} quote={block.quote} />
      ) : (
        <MemoirSection entry={block.entry} byId={byId} composition={composition} />
      )
    )}
  </div>
</Layout>
`
}
