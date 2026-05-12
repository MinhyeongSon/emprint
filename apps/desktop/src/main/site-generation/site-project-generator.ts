import type { AppLocale, SiteProjectKind } from '@emprint/shared'
import type { WorkspaceArtifact } from '../workspace/workspace-template'

/** Inputs for Astro (and future) site scaffolds under `src/`. */
export interface SiteGenerationContext {
  title: string
  description: string
  locale: AppLocale
}

/** Pluggable site scaffold (Column, Showcase, later IDE targets, etc.). */
export interface SiteProjectGenerator {
  readonly kind: SiteProjectKind
  generate(context: SiteGenerationContext): Promise<WorkspaceArtifact[]>
}
