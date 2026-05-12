import type { SiteProjectKind } from '@emprint/shared'
import {
  astroBlogLayoutArtifacts,
  astroBlogPageArtifacts,
  astroSharedArtifacts
} from './astro-stack'
import type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'

/**
 * Lightweight blog scaffold. Composed of three concerns:
 *
 *   1. Astro framework skeleton + CI (package.json, configs, workflow, README)
 *   2. Visual shell (layouts, components, global stylesheet)
 *   3. Pages (home, archive, post detail, tags)
 *
 * The pieces stay split so future kinds can mix-and-match (e.g. reuse the
 * shared framework and shell but plug in their own pages).
 */
export class ColumnSiteProjectGenerator implements SiteProjectGenerator {
  readonly kind: SiteProjectKind = 'column'

  async generate(context: SiteGenerationContext) {
    return [
      ...astroSharedArtifacts(context),
      ...astroBlogLayoutArtifacts(context),
      ...astroBlogPageArtifacts(context)
    ]
  }
}
