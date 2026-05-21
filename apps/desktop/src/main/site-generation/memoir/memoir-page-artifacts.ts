import type { WorkspaceArtifact } from '@emprint/core'
import { EpMemoirClasses } from './contract'

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

<section class="${EpMemoirClasses.Section} ${EpMemoirClasses.EditorialLead}" id={hero.data.id}>
  <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
    <div class="${EpMemoirClasses.EditorialLeadHero}">
      {hp.eyebrow ? <p class="${EpMemoirClasses.Eyebrow}">{String(hp.eyebrow)}</p> : null}
      <h1 class="${EpMemoirClasses.HeroTitle}">{String(hp.title ?? '')}</h1>
      {hp.subtitle ? <p class="${EpMemoirClasses.HeroSubtitle}">{String(hp.subtitle)}</p> : null}
    </div>
    <aside class="${EpMemoirClasses.EditorialLeadQuote}" id={quote.data.id}>
      {qp.body ? <MemoirRichText text={String(qp.body)} class="${EpMemoirClasses.QuoteBody}" as="blockquote" /> : null}
      {qp.attribution ? <p class="${EpMemoirClasses.QuoteAttribution}">— {String(qp.attribution)}</p> : null}
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
    <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Hero}" id={entry.data.id}>
      <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
        {p.eyebrow ? <p class="${EpMemoirClasses.Eyebrow}">{String(p.eyebrow)}</p> : null}
        <h1 class="${EpMemoirClasses.HeroTitle}">{String(p.title ?? '')}</h1>
        {p.subtitle ? <p class="${EpMemoirClasses.HeroSubtitle}">{String(p.subtitle)}</p> : null}
      </div>
    </section>
  )
) : type === 'Quote' ? (
  composition === 'editorial' ? null : (
    <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Quote}" id={entry.data.id}>
      <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
        {p.body ? <MemoirRichText text={String(p.body)} class="${EpMemoirClasses.QuoteBody}" as="blockquote" /> : null}
        {p.attribution ? <p class="${EpMemoirClasses.QuoteAttribution}">— {String(p.attribution)}</p> : null}
      </div>
    </section>
  )
) : type === 'Introduction' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Introduction}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      {p.title ? <h2 class="${EpMemoirClasses.IntroductionTitle}">{String(p.title)}</h2> : null}
      {p.body ? <MemoirRichText text={String(p.body)} class="${EpMemoirClasses.IntroductionBody}" /> : null}
    </div>
  </section>
) : type === 'Project' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Project}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      <div class={isGrid ? '${EpMemoirClasses.ProjectMasonry}' : '${EpMemoirClasses.ProjectStack}'}>
        <article class="${EpMemoirClasses.Project}">
          <h2 class="${EpMemoirClasses.ProjectTitle}">{String(p.title ?? '')}</h2>
          {p.body ? <MemoirRichText text={String(p.body)} class="${EpMemoirClasses.ProjectBody}" /> : null}
        </article>
      </div>
    </div>
  </section>
) : type === 'Skill' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Skill}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      <p class="${EpMemoirClasses.SkillName}">
        {String(p.name ?? '')}
        {p.level ? <span class="${EpMemoirClasses.SkillLevel}"> · {String(p.level)}</span> : null}
      </p>
    </div>
  </section>
) : type === 'ProjectGroup' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.ProjectGroup}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      {p.title ? <h2 class="${EpMemoirClasses.ProjectGroupTitle}">{String(p.title)}</h2> : null}
      <div class={isGrid ? '${EpMemoirClasses.ProjectMasonry}' : '${EpMemoirClasses.ProjectStack}'}>
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child || child.data.type !== 'Project') return null
          const cp = child.data.props
          return (
            <article class="${EpMemoirClasses.Project}" id={child.data.id}>
              <h3 class="${EpMemoirClasses.ProjectTitle}">{String(cp.title ?? '')}</h3>
              {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.ProjectBody}" /> : null}
            </article>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'SkillGroup' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.SkillGroup}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      {p.title ? <h2 class="${EpMemoirClasses.SkillGroupTitle}">{String(p.title)}</h2> : null}
      <ul class="${EpMemoirClasses.SkillList}">
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child || child.data.type !== 'Skill') return null
          const cp = child.data.props
          return (
            <li class="${EpMemoirClasses.Skill}" id={child.data.id}>
              <span class="${EpMemoirClasses.SkillName}">{String(cp.name ?? '')}</span>
              {cp.level ? <span class="${EpMemoirClasses.SkillLevel}">{String(cp.level)}</span> : null}
            </li>
          )
        })}
      </ul>
    </div>
  </section>
) : type === 'Timeline' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Timeline}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      {p.title ? <h2 class="${EpMemoirClasses.TimelineTitle}">{String(p.title)}</h2> : null}
      <div class="${EpMemoirClasses.TimelineList}">
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child) return null
          const cp = child.data.props
          const ct = child.data.type
          return (
            <div class="${EpMemoirClasses.TimelineItem}" id={child.data.id}>
              {ct === 'Introduction' ? (
                <>
                  {cp.title ? <h3 class="${EpMemoirClasses.IntroductionTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.IntroductionBody}" /> : null}
                </>
              ) : ct === 'Quote' ? (
                <>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.QuoteBody}" as="blockquote" /> : null}
                  {cp.attribution ? <p class="${EpMemoirClasses.QuoteAttribution}">— {String(cp.attribution)}</p> : null}
                </>
              ) : ct === 'Project' ? (
                <article class="${EpMemoirClasses.Project}">
                  <h3 class="${EpMemoirClasses.ProjectTitle}">{String(cp.title ?? '')}</h3>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.ProjectBody}" /> : null}
                </article>
              ) : ct === 'Skill' ? (
                <p class="${EpMemoirClasses.SkillName}">
                  {String(cp.name ?? '')}
                  {cp.level ? <span class="${EpMemoirClasses.SkillLevel}"> · {String(cp.level)}</span> : null}
                </p>
              ) : ct === 'Contact' ? (
                <>
                  {cp.title ? <h3 class="${EpMemoirClasses.ContactTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.ContactBody}" /> : null}
                </>
              ) : (
                <p class="${EpMemoirClasses.Muted}">{ct}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'Gallery' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Gallery}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      {p.title ? <h2 class="${EpMemoirClasses.GalleryTitle}">{String(p.title)}</h2> : null}
      <div class={isGrid ? '${EpMemoirClasses.ProjectMasonry}' : '${EpMemoirClasses.GalleryGrid}'}>
        {children.map((childId) => {
          const child = byId.get(childId)
          if (!child) return null
          const cp = child.data.props
          const ct = child.data.type
          const itemClass = isGrid && ct === 'Project' ? '${EpMemoirClasses.Project}' : '${EpMemoirClasses.GalleryItem}'
          return (
            <article class={itemClass} id={child.data.id}>
              {ct === 'Project' ? (
                <>
                  <h3 class="${EpMemoirClasses.ProjectTitle}">{String(cp.title ?? '')}</h3>
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.ProjectBody}" /> : null}
                </>
              ) : ct === 'Introduction' ? (
                <>
                  {cp.title ? <h3 class="${EpMemoirClasses.IntroductionTitle}">{String(cp.title)}</h3> : null}
                  {cp.body ? <MemoirRichText text={String(cp.body)} class="${EpMemoirClasses.IntroductionBody}" /> : null}
                </>
              ) : (
                <p class="${EpMemoirClasses.Muted}">{ct}</p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  </section>
) : type === 'Contact' ? (
  <section class="${EpMemoirClasses.Section} ${EpMemoirClasses.Contact}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      {p.title ? <h2 class="${EpMemoirClasses.ContactTitle}">{String(p.title)}</h2> : null}
      {p.body ? <MemoirRichText text={String(p.body)} class="${EpMemoirClasses.ContactBody}" /> : null}
    </div>
  </section>
) : (
  <section class="${EpMemoirClasses.Section}" id={entry.data.id}>
    <div class="${EpMemoirClasses.SectionInner} ${EpMemoirClasses.Container}">
      <p class="${EpMemoirClasses.Muted}">{type}</p>
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
  <div class="${EpMemoirClasses.Page}" data-composition={composition}>
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
