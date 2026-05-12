import type { SiteProjectKind } from '@emprint/shared'
import { astroSharedArtifacts, showcaseDataJson, showcaseIndexPage } from './astro-stack'
import type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'

export class ShowcaseSiteProjectGenerator implements SiteProjectGenerator {
  readonly kind: SiteProjectKind = 'showcase'

  async generate(context: SiteGenerationContext) {
    return [...astroSharedArtifacts(context), showcaseDataJson(context), showcaseIndexPage(context)]
  }
}
