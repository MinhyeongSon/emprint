import path from 'node:path'
import { ipcMain } from 'electron'
import { ipcChannels, parseGithubRepoFromRemoteUrl, type WorkspaceCatalogEntry } from '@emprint/shared'
import { readCatalog, upsertCatalogEntry, writeCatalog } from '../../catalog/catalog-store'
import { reconcileWorkspaceCatalog, syncPortableCatalogForAnthology } from '../../catalog/discover'
import { stopSiteDevServer } from '../../site-dev/server'
import type { IpcContext } from '../context'
import { getMountedWorkspaceRoot, setMountedWorkspaceRoot } from '../state'
import { githubRepoDeleteRemote, removeWorkspaceFromDisk } from '../core'

export function registerCatalogHandlers(_ctx: IpcContext): void {
  ipcMain.handle(ipcChannels.catalogList, async () => readCatalog())

  ipcMain.handle(ipcChannels.catalogReconcile, async (_event, input) => {
    const root = input?.workspaceRootDir?.trim()
    if (!root) {
      return { entries: [], added: 0, removed: 0, updated: 0 }
    }
    return await reconcileWorkspaceCatalog(root)
  })

  ipcMain.handle(
    ipcChannels.catalogAdd,
    async (_event, input: Omit<WorkspaceCatalogEntry, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }) => {
      const now = new Date().toISOString()
      const entry: WorkspaceCatalogEntry = {
        ...input,
        createdAt: input.createdAt ?? now,
        updatedAt: input.updatedAt ?? now
      }
      const next = upsertCatalogEntry(await readCatalog(), entry)
      await writeCatalog(next)
      await syncPortableCatalogForAnthology(entry.localDirectory, next)
      return entry
    }
  )

  ipcMain.handle(ipcChannels.catalogRemove, async (_event, input: { id: string; deleteRemote?: boolean }) => {
    const catalog = await readCatalog()
    const entry = catalog.find((e) => e.id === input.id)
    if (!entry) {
      return
    }

    const dir = path.resolve(entry.localDirectory.trim())

    if (input.deleteRemote && entry.remoteUrl?.trim()) {
      const repoRef = parseGithubRepoFromRemoteUrl(entry.remoteUrl)
      if (repoRef) {
        await githubRepoDeleteRemote(repoRef.owner, repoRef.repo)
      }
    }

    await removeWorkspaceFromDisk(dir)

    const mounted = getMountedWorkspaceRoot()
    if (mounted && path.resolve(mounted) === dir) {
      setMountedWorkspaceRoot(null)
      await stopSiteDevServer()
    }

    const next = catalog.filter((e) => e.id !== input.id)
    await writeCatalog(next)
    await syncPortableCatalogForAnthology(entry.localDirectory, next)
  })
}
