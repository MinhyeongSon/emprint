import { COLUMN_CLASS_PREFIX } from '@emprint/shared'

/**
 * Column anthology component contract — stable `ep-column-*` class names.
 * See docs/component-contract.md for rules and extension guidance.
 */
export { COLUMN_CLASS_PREFIX as EP_COLUMN_PREFIX }

function componentClass(component: string, part?: string): string {
  return part
    ? `${COLUMN_CLASS_PREFIX}-${component}-${part}`
    : `${COLUMN_CLASS_PREFIX}-${component}`
}

function utilityClass(name: string): string {
  return `${COLUMN_CLASS_PREFIX}-u-${name}`
}

export const EP = {
  Header: componentClass('Header'),
  HeaderInner: componentClass('Header', 'inner'),
  HeaderBrand: componentClass('Header', 'brand'),
  HeaderTagline: componentClass('Header', 'tagline'),
  HeaderNav: componentClass('Header', 'nav'),
  HeaderTools: componentClass('Header', 'tools'),

  ThemeToggle: componentClass('ThemeToggle'),
  ThemeToggleBtn: componentClass('ThemeToggle', 'btn'),

  Footer: componentClass('Footer'),
  FooterInner: componentClass('Footer', 'inner'),

  Site: componentClass('Site'),
  LandingIntro: componentClass('LandingIntro'),
  LandingIntroInner: componentClass('LandingIntro', 'inner'),
  LandingIntroText: componentClass('LandingIntro', 'text'),
  LandingIntroCursor: componentClass('LandingIntro', 'cursor'),

  PostList: componentClass('PostList'),
  PostListGrid: componentClass('PostList', 'grid'),
  PostFeed: componentClass('PostFeed'),
  PostFeedMain: componentClass('PostFeed', 'main'),
  PostFeedAside: componentClass('PostFeed', 'aside'),
  PostCard: componentClass('PostCard'),
  PostCardFeatured: componentClass('PostCard', 'featured'),
  PostCardCompact: componentClass('PostCard', 'compact'),
  PostCardTitle: componentClass('PostCard', 'title'),
  PostCardMeta: componentClass('PostCard', 'meta'),
  PostCardDesc: componentClass('PostCard', 'desc'),

  MagazineFeatured: componentClass('Magazine', 'featured'),
  MagazineSidebar: componentClass('Magazine', 'sidebar'),
  MagazineSidebarBlock: componentClass('Magazine', 'sidebar-block'),
  MagazineSidebarTitle: componentClass('Magazine', 'sidebar-title'),
  MagazineTrendingList: componentClass('Magazine', 'trending-list'),
  MagazineTrendingItem: componentClass('Magazine', 'trending-item'),

  Journal: componentClass('Journal'),
  JournalYear: componentClass('Journal', 'year'),
  JournalYearLabel: componentClass('Journal', 'year-label'),
  JournalMonth: componentClass('Journal', 'month'),
  JournalMonthLabel: componentClass('Journal', 'month-label'),
  JournalEntries: componentClass('Journal', 'entries'),

  Tag: componentClass('Tag'),
  TagRow: componentClass('TagRow'),

  PostHeader: componentClass('PostHeader'),
  PostHeaderMeta: componentClass('PostHeader', 'meta'),
  PostHeaderTitle: componentClass('PostHeader', 'title'),
  PostHeaderDesc: componentClass('PostHeader', 'desc'),

  Prose: componentClass('Prose'),

  SectionHead: componentClass('SectionHead'),
  SectionHeadTitle: componentClass('SectionHead', 'title'),
  SectionHeadAside: componentClass('SectionHead', 'aside'),
  SectionHeadLink: componentClass('SectionHead', 'link'),

  Empty: componentClass('Empty'),

  Container: utilityClass('Container'),
  Wide: utilityClass('Wide'),
  Muted: utilityClass('Muted'),
  Eyebrow: utilityClass('Eyebrow'),
  Title: utilityClass('Title')
} as const

export type EpClass = (typeof EP)[keyof typeof EP]
