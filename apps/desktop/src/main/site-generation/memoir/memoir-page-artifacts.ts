import type { WorkspaceArtifact } from '../../workspace/workspace-template'
import { EP } from './contract'

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

interface Props {
  hero: CollectionEntry<'sections'>
  quote: CollectionEntry<'sections'>
}

const { hero, quote } = Astro.props
const hp = hero.data.props
const qp = quote.data.props
---

<section class="${EP.Section} ${EP.EditorialLead}" id={hero.data.id}>
  <div class="${EP.SectionInner} ${EP.Container}">
    <div class="${EP.EditorialLeadHero}">
      {hp.eyebrow ? <p class="${EP.Eyebrow}">{String(hp.eyebrow)}</p> : null}
      <h1 class="${EP.HeroTitle}">{String(hp.title ?? '')}</h1>
      {hp.subtitle ? <p class="${EP.HeroSubtitle}">{String(hp.subtitle)}</p> : null}
    </div>
    <aside class="${EP.EditorialLeadQuote}" id={quote.data.id}>
      {qp.body ? <MemoirRichText text={String(qp.body)} class="${EP.QuoteBody}" as="blockquote" /> : null}
      {qp.attribution ? <p class="${EP.QuoteAttribution}">— {String(qp.attribution)}</p> : null}
    </aside>
  </div>
</section>
`
}

function memoirSectionAstro(): string {
  return `---
import type { CollectionEntry } from 'astro:content'
import MemoirRichText from './MemoirRichText.astro'

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
    <section class="${EP.Section} ${EP.Hero}" id={entry.data.id}>
      <div class="${EP.SectionInner} ${EP.Container}">
        {p.eyebrow ? <p class="${EP.Eyebrow}">{String(p.eyebrow)}</p> : null}
        <h1 class="${EP.HeroTitle}">{String(p.title ?? '')}</h1>
        {p.subtitle ? <p class="${EP.HeroSubtitle}">{String(p.subtitle)}</p> : null}
      </div>
    </section>
  )
) : type === 'Quote' ? (
  composition === 'editorial' ? null : (
    <section class="${EP.Section} ${EP.Quote}" id={entry.data.id}>
      <div class="${EP.SectionInner} ${EP.Container}">
        {p.body ? <MemoirRichText text={String(p.body)} class="${EP.QuoteBody}" as="blockquote" /> : null}
        {p.attribution ? <p class="${EP.QuoteAttribution}">— {String(p.attribution)}</p> : null}
      </div>
    </section>
  )
) : type === 'Introduction' ? (
  <section class="${EP.Section} ${EP.Introduction}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      {p.title ? <h2 class="${EP.IntroductionTitle}">{String(p.title)}</h2> : null}
      {p.body ? <MemoirRichText text={String(p.body)} class="${EP.IntroductionBody}" /> : null}
    </div>
  </section>
) : type === 'Project' ? (
  <section class="${EP.Section} ${EP.Project}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      <div class={isGrid ? '${EP.ProjectMasonry}' : '${EP.ProjectStack}'}>
        <article class="${EP.Project}">
          <h2 class="${EP.ProjectTitle}">{String(p.title ?? '')}</h2>
          {p.body ? <MemoirRichText text={String(p.body)} class="${EP.ProjectBody}" /> : null}
        </article>
      </div>
    </div>
  </section>
) : type === 'Skill' ? (
  <section class="${EP.Section} ${EP.Skill}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      <p class="${EP.SkillName}">
        {String(p.name ?? '')}
        {p.level ? <span class="${EP.SkillLevel}"> · {String(p.level)}</span> : null}
      </p>
    </div>
  </section>
) : type === 'ProjectGroup' ? (
  <section class="${EP.Section} ${EP.ProjectGroup}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      {p.title ? <h2 class="${EP.ProjectGroupTitle}">{String(p.title)}</h2> : null}
      <div class={isGrid ? '${EP.ProjectMasonry}' : '${EP.ProjectStack}'}>
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child || child.data.type !== 'Project') return null
          const cp = child.data.props
          return (
            <article class="${EP.Project}" id={child.data.id}>
              <h3 class="${EP.ProjectTitle}">{String(cp.title ?? '')}</h3>
              {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.ProjectBody}" /> : null}
            </article>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'SkillGroup' ? (
  <section class="${EP.Section} ${EP.SkillGroup}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      {p.title ? <h2 class="${EP.SkillGroupTitle}">{String(p.title)}</h2> : null}
      <ul class="${EP.SkillList}">
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child || child.data.type !== 'Skill') return null
          const cp = child.data.props
          return (
            <li class="${EP.Skill}" id={child.data.id}>
              <span class="${EP.SkillName}">{String(cp.name ?? '')}</span>
              {cp.level ? <span class="${EP.SkillLevel}">{String(cp.level)}</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  </section>
) : type === 'Timeline' ? (
  <section class="${EP.Section} ${EP.Timeline}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      {p.title ? <h2 class="${EP.TimelineTitle}">{String(p.title)}</h2> : null}
      <div class="${EP.TimelineList}">
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child) return null
          const cp = child.data.props
          const ct = child.data.type
          return (
            <div class="${EP.TimelineItem}" id={child.data.id}>
              {ct === 'Introduction' ? (
                <>
                  {cp.title ? <h3 class="${EP.IntroductionTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.IntroductionBody}" /> : null}
                </>
              ) : ct === 'Quote' ? (
                <>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.QuoteBody}" as="blockquote" /> : null}
                  {cp.attribution ? <p class="${EP.QuoteAttribution}">— {String(cp.attribution)}</p> : null}
                </>
              ) : ct === 'Project' ? (
                <article class="${EP.Project}">
                  <h3 class="${EP.ProjectTitle}">{String(cp.title ?? '')}</h3>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.ProjectBody}" /> : null}
                </article>
              ) : ct === 'Skill' ? (
                <p class="${EP.SkillName}">
                  {String(cp.name ?? '')}
                  {cp.level ? <span class="${EP.SkillLevel}"> · {String(cp.level)}</span> : null}
                </p>
              ) : ct === 'Contact' ? (
                <>
                  {cp.title ? <h3 class="${EP.ContactTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.ContactBody}" /> : null}
                </>
              ) : (
                <p class="${EP.Muted}">{ct}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'Gallery' ? (
  <section class="${EP.Section} ${EP.Gallery}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      {p.title ? <h2 class="${EP.GalleryTitle}">{String(p.title)}</h2> : null}
      <div class={isGrid ? '${EP.ProjectMasonry}' : '${EP.GalleryGrid}'}>
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child) return null
          const cp = child.data.props
          const ct = child.data.type
          const itemClass = isGrid && ct === 'Project' ? '${EP.Project}' : '${EP.GalleryItem}'
          return (
            <article class={itemClass} id={child.data.id}>
              {ct === 'Project' ? (
                <>
                  <h3 class="${EP.ProjectTitle}">{String(cp.title ?? '')}</h3>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.ProjectBody}" /> : null}
                </>
              ) : ct === 'Introduction' ? (
                <>
                  {cp.title ? <h3 class="${EP.IntroductionTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EP.IntroductionBody}" /> : null}
                </>
              ) : (
                <p class="${EP.Muted}">{ct}</p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'Contact' ? (
  <section class="${EP.Section} ${EP.Contact}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      {p.title ? <h2 class="${EP.ContactTitle}">{String(p.title)}</h2> : null}
      {p.body ? <MemoirRichText text={String(p.body)} class="${EP.ContactBody}" /> : null}
    </div>
  </section>
) : (
  <section class="${EP.Section}" id={entry.data.id}>
    <div class="${EP.SectionInner} ${EP.Container}">
      <p class="${EP.Muted}">{type}</p>
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
  <div class="${EP.Page}" data-composition={composition}>
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
