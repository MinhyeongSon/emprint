import type { AppLocale, SiteProjectKind } from '@emprint/shared'
import type { WorkspaceArtifact } from '../workspace/workspace-artifact'

export interface SiteGenerationContext {
  title: string
  description: string
  locale: AppLocale
  themeColor?: string
}

export interface SiteProjectGenerator {
  readonly kind: SiteProjectKind
  generate(context: SiteGenerationContext): Promise<WorkspaceArtifact[]>
}

export interface SiteProjectGeneratorRegistry {
  get(kind: SiteProjectKind): SiteProjectGenerator
}
