import type { AppLocale, SiteProjectKind } from '@emprint/shared'
import type { WorkspaceArtifact } from '../workspace/workspace-template'

/** Inputs for Astro (and future) site scaffolds under `src/`. */
export interface SiteGenerationContext {
  title: string
  description: string
  locale: AppLocale
  /** Hub wizard accent; applied to `--accent` in generated `src/styles/global.css`. */
  themeColor?: string
}

/** Pluggable site scaffold (Column today; Memoir and other formats planned). */
export interface SiteProjectGenerator {
  readonly kind: SiteProjectKind
  generate(context: SiteGenerationContext): Promise<WorkspaceArtifact[]>
}
