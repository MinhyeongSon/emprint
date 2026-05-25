import type { SiteProjectKind } from '@emprint/shared'

/**
 * In-process workspace mount state for the desktop runtime.
 * Electron IPC and the renderer coordinate through main-process ownership of this object.
 */
export class WorkspaceRuntime {
  #root: string | null = null
  #siteProjectKind: SiteProjectKind = 'column'

  mount(root: string, kind: SiteProjectKind): void {
    this.#root = root
    this.#siteProjectKind = kind
  }

  unmount(): void {
    this.#root = null
    this.#siteProjectKind = 'column'
  }

  get mountedRoot(): string | null {
    return this.#root
  }

  get siteProjectKind(): SiteProjectKind {
    return this.#siteProjectKind
  }

  requireMounted(): string {
    if (!this.#root) {
      throw new Error('No workspace is mounted.')
    }
    return this.#root
  }

  assertColumn(): void {
    if (this.#siteProjectKind !== 'column') {
      throw new Error('This action is only available for Column (blog) workspaces.')
    }
  }

  assertMemoir(): void {
    if (this.#siteProjectKind !== 'memoir') {
      throw new Error('Sections are only available in Memoir workspaces.')
    }
  }

  assertDictionary(): void {
    if (this.#siteProjectKind !== 'dictionary') {
      throw new Error('This action is only available for Dictionary workspaces.')
    }
  }

  assertFragments(): void {
    if (this.#siteProjectKind !== 'fragments') {
      throw new Error('This action is only available for Fragments workspaces.')
    }
  }

  assertBook(): void {
    if (this.#siteProjectKind !== 'book') {
      throw new Error('This action is only available for Book workspaces.')
    }
  }
}

export const workspaceRuntime = new WorkspaceRuntime()
