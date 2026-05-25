import {
  ARTWORK_MANIFEST_RELATIVE_PATH,
  ARTWORK_MANIFEST_VERSION,
  type ArtworkManifestFile
} from '@emprint/shared'

export function createStarterArtworkManifestArtifact(): { relativePath: string; content: string } {
  const manifest: ArtworkManifestFile = { version: ARTWORK_MANIFEST_VERSION, items: [] }
  return {
    relativePath: ARTWORK_MANIFEST_RELATIVE_PATH,
    content: `${JSON.stringify(manifest, null, 2)}\n`
  }
}
