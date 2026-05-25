import type { WorkspaceArtifact } from '@emprint/core'
import { EpFragmentsClasses } from './contract'

export function createFragmentsPageArtifacts(): WorkspaceArtifact[] {
  const EP = EpFragmentsClasses
  return [
    {
      relativePath: 'src/pages/index.astro',
      content: `---
import Layout from '../layouts/Layout.astro'
import LpShelf from '../components/LpShelf.astro'
import GalleryMasonry from '../components/GalleryMasonry.astro'
import themeFile from '../../config/theme.json'
import artworkManifest from '../../config/artwork-manifest.json'

const items = [...artworkManifest.items].sort((a, b) => a.sort - b.sort)
const composition = themeFile.layoutComposition ?? 'lpShelf'
---

<Layout title="Gallery" current="home">
  <section class="${EP.Gallery}">
    <div class="${EP.GalleryInner}">
      {composition === 'gallery' ? (
        <GalleryMasonry items={items} />
      ) : (
        <LpShelf items={items} />
      )}
    </div>
  </section>
</Layout>
`
    }
  ]
}

export function getFragmentsPageTemplateSyncArtifacts(): WorkspaceArtifact[] {
  return createFragmentsPageArtifacts()
}
