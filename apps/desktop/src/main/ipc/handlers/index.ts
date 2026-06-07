import type { IpcContext } from '../context'
import { registerArtworkHandlers } from './artwork'
import { registerStoryHandlers } from './story'
import { registerAssetsHandlers } from './assets'
import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'
import { registerGitHandlers } from './git'
import { registerMigrationHandlers } from './migration'
import { registerDictionaryContentsHandlers } from './dictionary-contents'
import { registerDictionaryIndexHandlers } from './dictionary-index'
import { registerKnowledgeHandlers } from './knowledge'
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
  registerKnowledgeHandlers()
  registerDictionaryIndexHandlers()
  registerDictionaryContentsHandlers()
  registerSectionsHandlers()
  registerWorkspaceSrcHandlers()
  registerMigrationHandlers()
  registerAssetsHandlers()
  registerArtworkHandlers()
  registerStoryHandlers()
  registerWindowHandlers()
}
