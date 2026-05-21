/** Frontmatter keys Emprint Column posts understand (Astro content schema). */
export const EMPRINT_MARKDOWN_FIELDS = [
  'title',
  'description',
  'tags',
  'draft',
  'createdAt',
  'updatedAt'
] as const

export type EmprintMarkdownField = (typeof EMPRINT_MARKDOWN_FIELDS)[number]

/** One row: user's YAML key → fixed Emprint field. Empty `sourceKey` skips that field. */
export interface MarkdownFieldMapping {
  emprintField: EmprintMarkdownField
  sourceKey: string
}

export interface MarkdownMigrationScanInput {
  sourceDir: string
}

export interface MarkdownMigrationScanResult {
  fileCount: number
  /** Distinct frontmatter keys found (for user reference). */
  frontmatterKeys: string[]
}

export interface MarkdownMigrationRunInput {
  sourceDir: string
  mappings: MarkdownFieldMapping[]
  importAsDraft?: boolean
  skipExisting?: boolean
}

export interface MarkdownMigrationFailure {
  fileName: string
  message: string
}

export interface MarkdownMigrationRunResult {
  imported: number
  skipped: number
  failed: number
  failures: MarkdownMigrationFailure[]
}
