import { BOOK_CLASS_PREFIX } from '@emprint/shared'

export { BOOK_CLASS_PREFIX as EP_BOOK_PREFIX }

function componentClass(component: string, part?: string): string {
  return part ? `${BOOK_CLASS_PREFIX}-${component}-${part}` : `${BOOK_CLASS_PREFIX}-${component}`
}

function utilityClass(name: string): string {
  return `${BOOK_CLASS_PREFIX}-u-${name}`
}

export const EpBookClasses = {
  ThemeFab: componentClass('ThemeFab'),
  ThemeFabBtn: componentClass('ThemeFab', 'btn'),
  Footer: componentClass('Footer'),
  FooterInner: componentClass('Footer', 'inner'),
  Site: componentClass('Site'),
  Story: componentClass('Story'),
  StoryInner: componentClass('Story', 'inner'),
  StoryTitle: componentClass('Story', 'title'),
  Pages: componentClass('Pages'),
  PagesStage: componentClass('Pages', 'stage'),
  PagesSheet: componentClass('Pages', 'sheet'),
  PagesSheetInner: componentClass('Pages', 'sheet-inner'),
  PagesNav: componentClass('Pages', 'nav'),
  PagesNavBtn: componentClass('Pages', 'nav-btn'),
  PagesIndicator: componentClass('Pages', 'indicator'),
  Scroll: componentClass('Scroll'),
  ScrollInner: componentClass('Scroll', 'inner'),
  Prose: componentClass('Prose'),
  Empty: componentClass('Empty'),
  Container: utilityClass('Container'),
  Wide: utilityClass('Wide'),
  Muted: utilityClass('Muted')
} as const
