import type { SiteProjectKind } from '@emprint/shared'
import type { WorkspaceArtifact } from '@emprint/core'
import { astroSharedArtifacts } from './astro-stack'
import { createContentConfigArtifact } from './content-config-artifacts'
import { createFragmentsLayoutArtifacts } from './fragments/fragments-layout-artifacts'
import type { SiteGenerationContext, SiteProjectGenerator } from './site-project-generator'

function fragmentsPackageJsonPatch(artifacts: WorkspaceArtifact[]): WorkspaceArtifact[] {
  return artifacts.map((a) => {
    if (a.relativePath !== 'package.json') return a
    const pkg = JSON.parse(a.content) as {
      scripts: Record<string, string>
    }
    pkg.scripts['sync:artwork'] = 'node ./scripts/sync-artwork.mjs'
    pkg.scripts.predev = 'node ./scripts/sync-theme.mjs && node ./scripts/sync-artwork.mjs'
    pkg.scripts.prebuild = 'node ./scripts/sync-theme.mjs && node ./scripts/sync-artwork.mjs'
    delete pkg.scripts['sync:assets']
    return { ...a, content: `${JSON.stringify(pkg, null, 2)}\n` }
  })
}

const syncArtworkScript = `import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const src = path.join(root, 'artwork')
const dest = path.join(root, 'public', 'artwork')

if (!existsSync(src)) {
  await mkdir(src, { recursive: true })
}

if (existsSync(dest)) {
  await rm(dest, { recursive: true, force: true })
}
await mkdir(path.dirname(dest), { recursive: true })
if (existsSync(src)) {
  await cp(src, dest, { recursive: true })
}
console.log('[emprint] synced artwork → public/artwork')
`

/** Fragments image-gallery scaffold (JPEG under artwork/). */
export class FragmentsSiteProjectGenerator implements SiteProjectGenerator {
  readonly kind: SiteProjectKind = 'fragments'

  async generate(context: SiteGenerationContext) {
    return [
      ...fragmentsPackageJsonPatch(astroSharedArtifacts(context)),
      { relativePath: 'scripts/sync-artwork.mjs', content: syncArtworkScript },
      createContentConfigArtifact('fragments'),
      ...createFragmentsLayoutArtifacts(context)
    ]
  }
}
