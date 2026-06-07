import { BOOK_CLASS_PREFIX } from '@emprint/shared'
import { componentClass as cc, utilityClass as uc } from '../shared/contract-helpers'

export { BOOK_CLASS_PREFIX as EP_BOOK_PREFIX }

const componentClass = (component: string, part?: string) => cc(BOOK_CLASS_PREFIX, component, part)
const utilityClass = (name: string) => uc(BOOK_CLASS_PREFIX, name)

export const EpBookClasses = {
  ThemeFab: componentClass('ThemeFab'),
  ThemeFabBtn: componentClass('ThemeFab', 'btn'),
  Footer: componentClass('Footer'),
  FooterInner: componentClass('Footer', 'inner'),
  Site: componentClass('Site'),
  Story: componentClass('Story'),
  StoryInner: componentClass('Story', 'inner'),
  StoryTitle: componentClass('Story', 'title'),
  StorySubtitle: componentClass('Story', 'subtitle'),
  StoryDescription: componentClass('Story', 'description'),
  StoryAuthor: componentClass('Story', 'author'),
  StoryLead: componentClass('Story', 'lead'),
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
