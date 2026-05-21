import { WorkspaceBootstrapper } from '@emprint/core'
import { registerGithubRepoCreate } from '../auth'
import { NodeFileSystemGateway } from '../infrastructure/node-file-system-gateway'
import { SimpleGitProviderFactory } from '../infrastructure/simple-git-provider'
import { siteProjectGeneratorRegistry } from '../site-generation/site-generator-registry'
import { githubRepoCreate, registerAppCloseGuard } from './core'
import type { IpcContext } from './context'
import { registerAllIpcHandlers } from './handlers'

export { getMountedWorkspaceRoot } from './state'
export { registerAppCloseGuard } from './core'

export function setupIpcHandlers(): void {
  const ctx: IpcContext = {
    bootstrapper: new WorkspaceBootstrapper({
      fileSystem: new NodeFileSystemGateway(),
      gitProviderFactory: new SimpleGitProviderFactory(),
      siteGenerators: siteProjectGeneratorRegistry
    })
  }

  registerAllIpcHandlers(ctx)
  registerGithubRepoCreate(githubRepoCreate)
}
