import type { IpcContext } from '../context'
import { registerAssetsHandlers } from './assets'
import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'
import { registerGitHandlers } from './git'
import { registerMigrationHandlers } from './migration'
import { registerPostsHandlers } from './posts'
import { registerSectionsHandlers } from './sections'
import { registerSystemHandlers, registerSiteDevHandlers } from './system'
import { registerWindowHandlers } from './window'
import { registerWorkspaceHandlers } from './workspace'
import { registerWorkspaceSrcHandlers } from './workspace-src'

export function registerAllIpcHandlers(ctx: IpcContext): void {
  registerSystemHandlers()
  registerSiteDevHandlers()
  registerAuthHandlers()
  registerCatalogHandlers(ctx)
  registerWorkspaceHandlers(ctx)
  registerGitHandlers()
  registerPostsHandlers()
  registerSectionsHandlers()
  registerWorkspaceSrcHandlers()
  registerMigrationHandlers()
  registerAssetsHandlers()
  registerWindowHandlers()
}
