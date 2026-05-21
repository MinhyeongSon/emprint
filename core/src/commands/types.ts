export type CommandScope = 'app' | 'nav' | 'workspace'

export interface CommandDefinition {
  id: string
  label: string
  hint?: string
  meta?: string
  scopes?: CommandScope[]
  /** When provided and returns false, the command is omitted from palette listings. */
  when?: () => boolean
  execute: () => void | Promise<void>
}

export interface CommandPaletteEntry {
  id: string
  label: string
  hint?: string
  meta?: string
}
