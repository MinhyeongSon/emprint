import { MEMOIR_CLASS_PREFIX } from '@emprint/shared'
import { componentClass as cc, utilityClass as uc } from '../shared/contract-helpers'

/** Memoir anthology component contract — stable `ep-memoir-*` class names. */
export { MEMOIR_CLASS_PREFIX as EP_MEMOIR_PREFIX }

const componentClass = (component: string, part?: string) => cc(MEMOIR_CLASS_PREFIX, component, part)
const utilityClass = (name: string) => uc(MEMOIR_CLASS_PREFIX, name)

export const EpMemoirClasses = {
  Header: componentClass('Header'),
  HeaderInner: componentClass('Header', 'inner'),
  HeaderBrand: componentClass('Header', 'brand'),
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

  Page: componentClass('Page'),
  Section: componentClass('Section'),
  SectionInner: componentClass('Section', 'inner'),

  Hero: componentClass('Hero'),
  HeroTitle: componentClass('Hero', 'title'),
  HeroSubtitle: componentClass('Hero', 'subtitle'),
  HeroFigure: componentClass('Hero', 'figure'),
  HeroImage: componentClass('Hero', 'image'),

  Introduction: componentClass('Introduction'),
  IntroductionTitle: componentClass('Introduction', 'title'),
  IntroductionBody: componentClass('Introduction', 'body'),

  ProjectGroup: componentClass('ProjectGroup'),
  ProjectGroupTitle: componentClass('ProjectGroup', 'title'),
  Project: componentClass('Project'),
  ProjectTitle: componentClass('Project', 'title'),
  ProjectBody: componentClass('Project', 'body'),
  ProjectFigure: componentClass('Project', 'figure'),
  ProjectImage: componentClass('Project', 'image'),
  ProjectMeta: componentClass('Project', 'meta'),
  ProjectLink: componentClass('Project', 'link'),
  ProjectStack: componentClass('Project', 'stack'),
  ProjectMasonry: componentClass('Project', 'masonry'),

  EditorialLead: componentClass('EditorialLead'),
  EditorialLeadHero: componentClass('EditorialLead', 'hero'),
  EditorialLeadQuote: componentClass('EditorialLead', 'quote'),

  Contact: componentClass('Contact'),
  ContactTitle: componentClass('Contact', 'title'),
  ContactBody: componentClass('Contact', 'body'),
  ContactLinks: componentClass('Contact', 'links'),

  Quote: componentClass('Quote'),
  QuoteBody: componentClass('Quote', 'body'),
  QuoteAttribution: componentClass('Quote', 'attribution'),

  Skill: componentClass('Skill'),
  SkillName: componentClass('Skill', 'name'),
  SkillLevel: componentClass('Skill', 'level'),

  SkillGroup: componentClass('SkillGroup'),
  SkillGroupTitle: componentClass('SkillGroup', 'title'),
  SkillList: componentClass('SkillGroup', 'list'),

  Timeline: componentClass('Timeline'),
  TimelineTitle: componentClass('Timeline', 'title'),
  TimelineList: componentClass('Timeline', 'list'),
  TimelineItem: componentClass('Timeline', 'item'),
  TimelinePeriod: componentClass('Timeline', 'period'),

  Gallery: componentClass('Gallery'),
  GalleryTitle: componentClass('Gallery', 'title'),
  GalleryGrid: componentClass('Gallery', 'grid'),
  GalleryItem: componentClass('Gallery', 'item'),

  Container: utilityClass('Container'),
  Wide: utilityClass('Wide'),
  Muted: utilityClass('Muted'),
  Eyebrow: utilityClass('Eyebrow'),
  Title: utilityClass('Title')
} as const

export type EpMemoirClass = (typeof EpMemoirClasses)[keyof typeof EpMemoirClasses]

/** @deprecated Use `EpMemoirClasses`. */
export const EP = EpMemoirClasses
