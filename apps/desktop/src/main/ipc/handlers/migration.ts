import { ipcMain } from 'electron'
import { ipcChannels } from '@emprint/shared'
import { runMarkdownMigration } from '../../migration/markdown/import'
import { scanMarkdownSourceDir } from '../../migration/markdown/scan'
import { runTistoryMigration } from '../../migration/tistory/migrate'
import { scanTistoryBackup } from '../../migration/tistory/scan'
import { assertColumnWorkspace, ensureWorkspaceMounted } from '../state'
import { ensureEmprintGitignore, invalidateUntrackEmprintIgnoredCache, untrackEmprintIgnoredPaths } from '../core'

export function registerMigrationHandlers(): void {
  ipcMain.handle(ipcChannels.migrationTistoryScan, async (_event, input) => {
    assertColumnWorkspace()
    const backupDir = input?.backupDir?.trim()
    if (!backupDir) {
      return { posts: [] }
    }
    return await scanTistoryBackup(backupDir)
  })

  ipcMain.handle(ipcChannels.migrationTistoryRun, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    assertColumnWorkspace()
    const backupDir = input?.backupDir?.trim()
    if (!backupDir) {
      return { imported: 0, skipped: 0, failed: 0, failures: [] }
    }
    const result = await runTistoryMigration(root, input)
    await ensureEmprintGitignore(root)
    await untrackEmprintIgnoredPaths(root)
    invalidateUntrackEmprintIgnoredCache(root)
    return result
  })

  ipcMain.handle(ipcChannels.migrationMarkdownScan, async (_event, input) => {
    assertColumnWorkspace()
    const sourceDir = input?.sourceDir?.trim()
    if (!sourceDir) {
      return { fileCount: 0, frontmatterKeys: [] }
    }
    return await scanMarkdownSourceDir(sourceDir)
  })

  ipcMain.handle(ipcChannels.migrationMarkdownRun, async (_event, input) => {
    const root = ensureWorkspaceMounted()
    assertColumnWorkspace()
    const sourceDir = input?.sourceDir?.trim()
    if (!sourceDir) {
      return { imported: 0, skipped: 0, failed: 0, failures: [] }
    }
    const result = await runMarkdownMigration(root, input)
    await ensureEmprintGitignore(root)
    await untrackEmprintIgnoredPaths(root)
    invalidateUntrackEmprintIgnoredCache(root)
    return result
  })
}
