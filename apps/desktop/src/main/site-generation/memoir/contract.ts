import { MEMOIR_CLASS_PREFIX } from '@emprint/shared'

/** Memoir anthology component contract — stable `ep-memoir-*` class names. */
export { MEMOIR_CLASS_PREFIX as EP_MEMOIR_PREFIX }

function componentClass(component: string, part?: string): string {
  return part ? `${MEMOIR_CLASS_PREFIX}-${component}-${part}` : `${MEMOIR_CLASS_PREFIX}-${component}`
}

function utilityClass(name: string): string {
  return `${MEMOIR_CLASS_PREFIX}-u-${name}`
}

export const EP = {
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

  Introduction: componentClass('Introduction'),
  IntroductionTitle: componentClass('Introduction', 'title'),
  IntroductionBody: componentClass('Introduction', 'body'),

  ProjectGroup: componentClass('ProjectGroup'),
  ProjectGroupTitle: componentClass('ProjectGroup', 'title'),
  Project: componentClass('Project'),
  ProjectTitle: componentClass('Project', 'title'),
  ProjectBody: componentClass('Project', 'body'),
  ProjectStack: componentClass('Project', 'stack'),
  ProjectMasonry: componentClass('Project', 'masonry'),

  EditorialLead: componentClass('EditorialLead'),
  EditorialLeadHero: componentClass('EditorialLead', 'hero'),
  EditorialLeadQuote: componentClass('EditorialLead', 'quote'),

  Contact: componentClass('Contact'),
  ContactTitle: componentClass('Contact', 'title'),
  ContactBody: componentClass('Contact', 'body'),

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
