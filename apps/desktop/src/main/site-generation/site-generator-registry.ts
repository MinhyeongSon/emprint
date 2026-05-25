import type { SiteProjectGeneratorRegistry } from '@emprint/core'
import type { SiteProjectKind } from '@emprint/shared'
import { ColumnSiteProjectGenerator } from './column-site-generator'
import { DictionarySiteProjectGenerator } from './dictionary-site-generator'
import { FragmentsSiteProjectGenerator } from './fragments-site-generator'
import { BookSiteProjectGenerator } from './book-site-generator'
import { MemoirSiteProjectGenerator } from './memoir-site-generator'
import type { SiteProjectGenerator } from './site-project-generator'

const generators: SiteProjectGenerator[] = [
  new ColumnSiteProjectGenerator(),
  new MemoirSiteProjectGenerator(),
  new DictionarySiteProjectGenerator(),
  new FragmentsSiteProjectGenerator(),
  new BookSiteProjectGenerator()
]

const byKind = new Map<SiteProjectKind, SiteProjectGenerator>(generators.map((g) => [g.kind, g]))

export function getSiteProjectGenerator(kind: SiteProjectKind): SiteProjectGenerator {
  const found = byKind.get(kind)
  if (!found) {
    throw new Error(`No site project generator registered for kind: ${kind}`)
  }
  return found
}

export const siteProjectGeneratorRegistry: SiteProjectGeneratorRegistry = {
  get: getSiteProjectGenerator
}
