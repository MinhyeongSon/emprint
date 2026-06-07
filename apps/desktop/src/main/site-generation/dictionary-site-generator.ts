import type { SiteProjectKind } from '@emprint/shared'
import { astroSharedArtifacts } from './astro-stack'
import { createContentConfigArtifact } from './content-config-artifacts'
import { dictionaryPackageJsonPatch } from './dictionary/dictionary-package-json-patch'
import { createDictionaryLayoutArtifacts } from './dictionary/dictionary-layout-artifacts'
import type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'

/** Dictionary knowledge-base scaffold (markdown under knowledge/, hierarchical index). */
export class DictionarySiteProjectGenerator implements SiteProjectGenerator {
  readonly kind: SiteProjectKind = 'dictionary'

  async generate(context: SiteGenerationContext) {
    return [
      ...dictionaryPackageJsonPatch(astroSharedArtifacts(context)),
      createContentConfigArtifact('dictionary'),
      ...createDictionaryLayoutArtifacts(context)
    ]
  }
}
