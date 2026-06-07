import { useMemo } from 'react'
import type { AppLocale, MemoirLayoutComposition, MemoirSectionFile } from '@emprint/shared'
import {
  isMemoirContainerSectionType,
  normalizeMemoirAssetPath,
  parseMemoirContactLinks,
  renderMemoirRichText,
  sectionTitleFromProps
} from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { workspaceAssetPathToAssetUrl } from '@renderer/lib/asset-paths'
import { cn } from '@renderer/lib/cn'

function assetPreviewUrl(props: Record<string, unknown>, key: string): string {
  const raw = props[key]
  if (typeof raw !== 'string' || !raw.trim()) return ''
  return workspaceAssetPathToAssetUrl(normalizeMemoirAssetPath(raw))
}

function SectionPreviewBlock({
  section,
  allSections,
  composition
}: {
  section: MemoirSectionFile
  allSections: MemoirSectionFile[]
  composition: MemoirLayoutComposition
}) {
  const p = section.props
  const title = sectionTitleFromProps(section.type, p)

  if (composition === 'editorial' && section.type === 'Quote') {
    return (
      <p className="text-xs italic text-muted">
        Editorial layout merges the first Quote after Hero into the hero block on the public site.
      </p>
    )
  }

  if (section.type === 'Hero') {
    const img = assetPreviewUrl(p, 'image')
    return (
      <div className="space-y-2">
        {typeof p.eyebrow === 'string' && p.eyebrow ? (
          <p className="text-[10px] uppercase tracking-wide text-muted">{p.eyebrow}</p>
        ) : null}
        {img ? <img src={img} alt="" className="max-h-24 w-auto rounded-md object-cover" /> : null}
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {typeof p.subtitle === 'string' && p.subtitle ? (
          <p className="text-sm text-muted">{p.subtitle}</p>
        ) : null}
      </div>
    )
  }

  if (section.type === 'Project') {
    const img = assetPreviewUrl(p, 'image')
    return (
      <article className="space-y-2 rounded-md border border-border bg-panel2/40 p-3">
        {typeof p.period === 'string' && p.period ? (
          <p className="text-[10px] text-muted">{p.period}</p>
        ) : null}
        {img ? <img src={img} alt="" className="max-h-32 w-full rounded object-cover" /> : null}
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {typeof p.role === 'string' && p.role ? <p className="text-xs text-muted">{p.role}</p> : null}
        {typeof p.body === 'string' && p.body.trim() ? (
          <div
            className="prose-memoir-preview text-xs leading-relaxed text-ink/90"
            dangerouslySetInnerHTML={{ __html: renderMemoirRichText(p.body) }}
          />
        ) : null}
        {typeof p.link === 'string' && p.link ? (
          <a href={p.link} className="text-xs text-accent hover:underline">
            {title || p.link}
          </a>
        ) : null}
      </article>
    )
  }

  if (section.type === 'Introduction') {
    return (
      <div className="space-y-1.5">
        {typeof p.period === 'string' && p.period ? (
          <p className="text-[10px] text-muted">{p.period}</p>
        ) : null}
        {typeof p.title === 'string' && p.title ? (
          <h3 className="text-sm font-semibold text-ink">{p.title}</h3>
        ) : null}
        {typeof p.body === 'string' && p.body.trim() ? (
          <div
            className="text-xs leading-relaxed text-ink/90"
            dangerouslySetInnerHTML={{ __html: renderMemoirRichText(p.body) }}
          />
        ) : null}
      </div>
    )
  }

  if (section.type === 'Quote') {
    return (
      <blockquote className="border-l-2 border-accent/50 pl-3 text-sm italic text-ink/90">
        {typeof p.body === 'string' && p.body.trim() ? (
          <div dangerouslySetInnerHTML={{ __html: renderMemoirRichText(p.body) }} />
        ) : null}
        {typeof p.attribution === 'string' && p.attribution ? (
          <footer className="mt-2 text-xs not-italic text-muted">— {p.attribution}</footer>
        ) : null}
      </blockquote>
    )
  }

  if (section.type === 'Contact') {
    const links = parseMemoirContactLinks(p)
    return (
      <div className="space-y-2">
        {typeof p.title === 'string' && p.title ? (
          <h3 className="text-sm font-semibold text-ink">{p.title}</h3>
        ) : null}
        {links.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-xs">
            {links.map((link) => (
              <li key={`${link.label}-${link.url}`}>
                <a href={link.url} className="text-accent hover:underline">
                  {link.label || link.url}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {typeof p.body === 'string' && p.body.trim() ? (
          <div
            className="text-xs leading-relaxed text-ink/90"
            dangerouslySetInnerHTML={{ __html: renderMemoirRichText(p.body) }}
          />
        ) : null}
      </div>
    )
  }

  if (section.type === 'Skill') {
    return (
      <p className="text-sm text-ink">
        {typeof p.name === 'string' ? p.name : ''}
        {typeof p.level === 'string' && p.level ? (
          <span className="text-muted"> · {p.level}</span>
        ) : null}
      </p>
    )
  }

  if (isMemoirContainerSectionType(section.type)) {
    const childIds = section.children ?? []
    const children = childIds
      .map((id) => allSections.find((s) => s.id === id))
      .filter((s): s is MemoirSectionFile => Boolean(s))
    return (
      <div className="space-y-3">
        {typeof p.title === 'string' && p.title ? (
          <h3 className="text-sm font-semibold text-ink">{p.title}</h3>
        ) : null}
        <div
          className={cn(
            'space-y-2',
            composition === 'grid' && section.type === 'Gallery' && 'grid grid-cols-2 gap-2'
          )}
        >
          {children.length === 0 ? (
            <p className="text-xs text-muted">No children</p>
          ) : (
            children.map((child) => (
              <div key={child.id} className="rounded-md border border-border/80 bg-panel/60 p-2">
                <SectionPreviewBlock section={child} allSections={allSections} composition={composition} />
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return <p className="text-xs text-muted">{section.type}</p>
}

export function SectionPreviewPanel({
  locale,
  section,
  allSections,
  composition,
  editorialHeroHint
}: {
  locale: AppLocale
  section: MemoirSectionFile
  allSections: MemoirSectionFile[]
  composition: MemoirLayoutComposition
  editorialHeroHint?: boolean
}) {
  const unpublished = !section.published

  const layoutLabel = useMemo(() => {
    if (composition === 'grid') return pick(locale, 'Grid layout', '그리드 레이아웃')
    if (composition === 'editorial') return pick(locale, 'Editorial layout', '에디토리얼 레이아웃')
    return pick(locale, 'Timeline layout', '타임라인 레이아웃')
  }, [composition, locale])

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {pick(locale, 'Preview', '미리보기')}
        </h2>
        <p className="mt-0.5 text-[10px] text-muted">{layoutLabel}</p>
      </div>

      {editorialHeroHint ? (
        <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs leading-relaxed text-ink">
          {pick(
            locale,
            'With Editorial layout, if the next root section is a Quote, it merges with this Hero on the public site.',
            '에디토리얼 레이아웃에서는 다음 루트 섹션이 Quote이면 공개 사이트에서 이 Hero와 합쳐집니다.'
          )}
        </div>
      ) : null}

      {unpublished ? (
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {pick(locale, 'Hidden on site until published', '공개 전까지 사이트에 숨김')}
        </p>
      ) : null}

      <div
        className={cn(
          'rounded-lg border border-border bg-[rgb(var(--base))] p-4 text-[rgb(var(--ink))]',
          composition === 'timeline' && section.type !== 'Hero' && 'border-l-2 border-l-accent/30'
        )}
      >
        <SectionPreviewBlock section={section} allSections={allSections} composition={composition} />
      </div>
    </div>
  )
}
