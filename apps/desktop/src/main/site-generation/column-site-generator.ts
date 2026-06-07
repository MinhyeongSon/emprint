import type { SiteProjectKind } from '@emprint/shared'
import { astroSharedArtifacts } from './astro-stack'
import { createContentConfigArtifact } from './content-config-artifacts'
import { columnPackageJsonPatch } from './column/column-package-json-patch'
import { createColumnLayoutArtifacts } from './column/column-layout-artifacts'
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
      ...columnPackageJsonPatch(astroSharedArtifacts(context)),
      createContentConfigArtifact('column'),
      ...createColumnLayoutArtifacts(context)
    ]
  }
}
