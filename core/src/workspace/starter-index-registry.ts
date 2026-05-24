import {
  createDefaultIndexRegistry,
  serializeIndexRegistryFile,
  type IndexRegistryFile
} from '@emprint/shared'
import type { WorkspaceConfig } from '@emprint/shared'

export function createStarterIndexRegistryArtifact(config: WorkspaceConfig): {
  relativePath: string
  content: string
  registry: IndexRegistryFile
} {
  const locale = config.locale === 'ko' ? 'ko' : 'en'
  const registry = createDefaultIndexRegistry(locale)
  return {
    relativePath: 'config/index-registry.json',
    content: serializeIndexRegistryFile(registry),
    registry
  }
}
