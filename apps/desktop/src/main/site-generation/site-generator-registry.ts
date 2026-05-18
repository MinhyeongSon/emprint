import type { SiteProjectKind } from '@emprint/shared'
import { ColumnSiteProjectGenerator } from './column-site-generator'
import { MemoirSiteProjectGenerator } from './memoir-site-generator'
import type { SiteProjectGenerator } from './site-project-generator'

const generators: SiteProjectGenerator[] = [
  new ColumnSiteProjectGenerator(),
  new MemoirSiteProjectGenerator()
]

const byKind = new Map<SiteProjectKind, SiteProjectGenerator>(generators.map((g) => [g.kind, g]))

export function getSiteProjectGenerator(kind: SiteProjectKind): SiteProjectGenerator {
  const found = byKind.get(kind)
  if (!found) {
    throw new Error(`No site project generator registered for kind: ${kind}`)
  }
  return found
}

export type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'
