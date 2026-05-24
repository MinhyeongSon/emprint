import { DICTIONARY_CLASS_PREFIX } from '@emprint/shared'

/**
 * Dictionary anthology component contract — stable `ep-dictionary-*` class names.
 * See docs/component-contract.md for rules and extension guidance.
 */
export { DICTIONARY_CLASS_PREFIX as EP_DICTIONARY_PREFIX }

function componentClass(component: string, part?: string): string {
  return part
    ? `${DICTIONARY_CLASS_PREFIX}-${component}-${part}`
    : `${DICTIONARY_CLASS_PREFIX}-${component}`
}

function utilityClass(name: string): string {
  return `${DICTIONARY_CLASS_PREFIX}-u-${name}`
}

export const EpDictionaryClasses = {
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
  KnowledgeCard: componentClass('KnowledgeCard'),
  KnowledgeCardFeatured: componentClass('KnowledgeCard', 'featured'),
  KnowledgeCardCompact: componentClass('KnowledgeCard', 'compact'),
  KnowledgeCardTitle: componentClass('KnowledgeCard', 'title'),
  KnowledgeCardMeta: componentClass('KnowledgeCard', 'meta'),
  KnowledgeCardDesc: componentClass('KnowledgeCard', 'desc'),

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
  PostHeaderIndex: componentClass('PostHeader', 'index'),
  PostHeaderMeta: componentClass('PostHeader', 'meta'),
  PostHeaderTitle: componentClass('PostHeader', 'title'),
  PostHeaderDesc: componentClass('PostHeader', 'desc'),

  Prose: componentClass('Prose'),

  SectionHead: componentClass('SectionHead'),
  SectionHeadTitle: componentClass('SectionHead', 'title'),
  SectionHeadAside: componentClass('SectionHead', 'aside'),
  SectionHeadLink: componentClass('SectionHead', 'link'),

  Empty: componentClass('Empty'),

  IndexNav: componentClass('IndexNav'),
  IndexNavInline: `${DICTIONARY_CLASS_PREFIX}-IndexNav--inline`,
  IndexNavTitle: componentClass('IndexNav', 'title'),
  IndexNavTree: componentClass('IndexNav', 'tree'),
  IndexNavItem: componentClass('IndexNav', 'item'),
  IndexNavLink: componentClass('IndexNav', 'link'),
  IndexNavChildren: componentClass('IndexNav', 'children'),
  KnowledgeCardIndex: componentClass('KnowledgeCard', 'index'),

  HomeWithIndex: componentClass('HomeWithIndex'),
  HomeWithIndexAside: componentClass('HomeWithIndex', 'aside'),
  HomeWithIndexMain: componentClass('HomeWithIndex', 'main'),

  Container: utilityClass('Container'),
  Wide: utilityClass('Wide'),
  Muted: utilityClass('Muted'),
  Eyebrow: utilityClass('Eyebrow'),
  Title: utilityClass('Title')
} as const

export type EpDictionaryClass = (typeof EpDictionaryClasses)[keyof typeof EpDictionaryClasses]

/** @deprecated Use `EpDictionaryClasses`. */
export const EP = EpDictionaryClasses
