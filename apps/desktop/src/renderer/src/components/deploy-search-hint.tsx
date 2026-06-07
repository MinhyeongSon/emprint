import { Info } from 'lucide-react'
import type { AppLocale, SiteProjectKind } from '@emprint/shared'
import { pick } from '@renderer/lib/i18n'
import { cn } from '@renderer/lib/cn'

export function anthologyHasDeploySearch(siteKind: SiteProjectKind): boolean {
  return siteKind === 'column' || siteKind === 'dictionary'
}

export type DeploySearchHintContext = 'design' | 'authoring' | 'authoring-drafts' | 'publish'

function hintCopy(locale: AppLocale, context: DeploySearchHintContext): string {
  switch (context) {
    case 'design':
      return pick(
        locale,
        'Site search (/search/) is built when you publish. Preview does not include the search index.',
        '사이트 검색(/search/)은 게시·배포 시 빌드됩니다. 미리보기에는 검색 인덱스가 없습니다.'
      )
    case 'authoring':
      return pick(
        locale,
        'Search here filters your workspace. Visitors use /search/ on the live site after you publish.',
        '여기 검색은 작성 화면용입니다. 방문자는 게시 후 라이브 사이트 /search/에서 검색합니다.'
      )
    case 'authoring-drafts':
      return pick(
        locale,
        'Drafts are not on the public search index. Publish posts to include them on /search/.',
        '초안은 공개 검색 인덱스에 없습니다. 글을 게시해야 /search/에 포함됩니다.'
      )
    case 'publish':
      return pick(
        locale,
        'After deploy finishes, your live site Search page (/search/) indexes published content.',
        '배포가 끝나면 라이브 사이트 Search(/search/)에서 게시된 콘텐츠를 검색할 수 있습니다.'
      )
  }
}

export function DeploySearchHint({
  locale,
  context,
  className
}: {
  locale: AppLocale
  context: DeploySearchHintContext
  className?: string
}) {
  return (
    <p
      data-testid="deploy-search-hint"
      data-deploy-search-context={context}
      className={cn(
        'flex items-start gap-2 rounded-md border border-border/80 bg-panel2/35 px-3 py-2 text-[11px] leading-5 text-muted',
        className
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      <span>{hintCopy(locale, context)}</span>
    </p>
  )
}
