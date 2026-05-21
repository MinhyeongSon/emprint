/** A single file (relative path + content) produced by workspace bootstrap or site generators. */
export interface WorkspaceArtifact {
  relativePath: string
  content: string
}
