import { FRAGMENTS_CLASS_PREFIX } from '@emprint/shared'

export { FRAGMENTS_CLASS_PREFIX as EP_FRAGMENTS_PREFIX }

function componentClass(component: string, part?: string): string {
  return part
    ? `${FRAGMENTS_CLASS_PREFIX}-${component}-${part}`
    : `${FRAGMENTS_CLASS_PREFIX}-${component}`
}

function utilityClass(name: string): string {
  return `${FRAGMENTS_CLASS_PREFIX}-u-${name}`
}

export const EpFragmentsClasses = {
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
  Gallery: componentClass('Gallery'),
  GalleryInner: componentClass('Gallery', 'inner'),
  Shelf: componentClass('Shelf'),
  ShelfCarousel: componentClass('Shelf', 'carousel'),
  ShelfLayout: componentClass('Shelf', 'layout'),
  ShelfStage: componentClass('Shelf', 'stage'),
  ShelfDisc: componentClass('Shelf', 'disc'),
  ShelfHub: componentClass('Shelf', 'hub'),
  ShelfNav: componentClass('Shelf', 'nav'),
  ShelfNavBtn: componentClass('Shelf', 'nav-btn'),
  ShelfPreview: componentClass('Shelf', 'preview'),
  ShelfPreviewBtn: componentClass('Shelf', 'preview-btn'),
  ShelfPreviewMeta: componentClass('Shelf', 'preview-meta'),
  Record: componentClass('Record'),
  RecordActive: componentClass('Record', 'active'),
  RecordCover: componentClass('Record', 'cover'),
  RecordSpine: componentClass('Record', 'spine'),
  RecordTitle: componentClass('Record', 'title'),
  Lightbox: componentClass('Lightbox'),
  LightboxBackdrop: componentClass('Lightbox', 'backdrop'),
  LightboxPanel: componentClass('Lightbox', 'panel'),
  LightboxImage: componentClass('Lightbox', 'image'),
  LightboxCaption: componentClass('Lightbox', 'caption'),
  LightboxClose: componentClass('Lightbox', 'close'),
  Masonry: componentClass('Masonry'),
  MasonryScroller: componentClass('Masonry', 'scroller'),
  MasonryWall: componentClass('Masonry', 'wall'),
  MasonryItem: componentClass('Masonry', 'item'),
  MasonryItemBtn: componentClass('Masonry', 'item-btn'),
  MasonryItemCaption: componentClass('Masonry', 'item-caption'),
  MasonrySentinel: componentClass('Masonry', 'sentinel'),
  MasonryStatus: componentClass('Masonry', 'status'),
  Empty: componentClass('Empty'),
  Container: utilityClass('Container'),
  Wide: utilityClass('Wide'),
  Muted: utilityClass('Muted')
} as const
