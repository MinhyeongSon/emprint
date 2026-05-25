import type { SiteProjectKind } from '@emprint/shared'
import type { WorkspaceArtifact } from '@emprint/core'
import { astroSharedArtifacts } from './astro-stack'
import { createContentConfigArtifact } from './content-config-artifacts'
import { createBookLayoutArtifacts } from './book/book-layout-artifacts'
import type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'

function bookPackageJsonPatch(artifacts: WorkspaceArtifact[]): WorkspaceArtifact[] {
  return artifacts.map((a) => {
    if (a.relativePath !== 'package.json') return a
    const pkg = JSON.parse(a.content) as {
      scripts: Record<string, string>
      dependencies: Record<string, string>
    }
    pkg.scripts['sync:theme'] = 'node ./scripts/sync-theme.mjs'
    pkg.scripts.predev = 'node ./scripts/sync-theme.mjs'
    pkg.scripts.prebuild = 'node ./scripts/sync-theme.mjs'
    delete pkg.scripts['sync:assets']
    pkg.dependencies.marked = '^15.0.12'
    return { ...a, content: `${JSON.stringify(pkg, null, 2)}\n` }
  })
}

/** Book — single markdown story with Pages or Scroll public layout. */
export class BookSiteProjectGenerator implements SiteProjectGenerator {
  readonly kind: SiteProjectKind = 'book'

  async generate(context: SiteGenerationContext) {
    return [
      ...bookPackageJsonPatch(astroSharedArtifacts(context)),
      createContentConfigArtifact('book'),
      ...createBookLayoutArtifacts(context)
    ]
  }
}
