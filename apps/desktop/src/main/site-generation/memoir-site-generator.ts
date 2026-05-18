import type { SiteProjectKind } from '@emprint/shared'
import { astroSharedArtifacts } from './astro-stack'
import { createContentConfigArtifact } from './content-config-artifacts'
import { createMemoirLayoutArtifacts } from './memoir/memoir-layout-artifacts'
import type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'

export class MemoirSiteProjectGenerator implements SiteProjectGenerator {
  readonly kind: SiteProjectKind = 'memoir'

  async generate(context: SiteGenerationContext) {
    return [
      ...astroSharedArtifacts(context),
      createContentConfigArtifact('memoir'),
      ...createMemoirLayoutArtifacts(context)
    ]
  }
}
