import { ipcMain } from 'electron'
import { ipcChannels, type GitHubDeployStatus } from '@emprint/shared'
import { getAuthProvider, getHostingProvider, readGithubSession } from '../../auth'
import { isQaMockAuthEnabled } from '../../auth/qa/env'
import { fetchGithubDeployStatus } from '../../github-deploy-status'
import { mockGithubDeployStatus } from '../../qa/hooks'
import { readCatalog } from '../../catalog/catalog-store'
import { ensureWorkspaceMounted } from '../state'

export function registerAuthHandlers(): void {
  ipcMain.handle(ipcChannels.githubOAuthClientGet, async () => {
    return getAuthProvider('github').oauthClientGet()
  })

  ipcMain.handle(
    ipcChannels.githubOAuthClientSet,
    async (_event, input: { clientId: string; clientSecret?: string }) => {
      return getAuthProvider('github').oauthClientSet(input)
    }
  )

  ipcMain.handle(ipcChannels.githubAuthStatus, async () => {
    return getAuthProvider('github').authStatus()
  })

  ipcMain.handle(ipcChannels.githubAuthStart, async (_event, input: { scopes: string[] }) => {
    return getAuthProvider('github').authStart(input)
  })

  ipcMain.handle(ipcChannels.githubAuthPoll, async (_event, input: { deviceCode: string }) => {
    return getAuthProvider('github').authPoll(input)
  })

  ipcMain.handle(ipcChannels.githubLogout, async () => {
    await getAuthProvider('github').logout()
  })

  ipcMain.handle(ipcChannels.githubRepoCreate, async (_event, input) => {
    return getHostingProvider('github').repoCreate(input)
  })

  ipcMain.handle(ipcChannels.githubDeployStatus, async (): Promise<GitHubDeployStatus> => {
    if (isQaMockAuthEnabled()) {
      return mockGithubDeployStatus()
    }
    return await fetchGithubDeployStatus({
      readSession: readGithubSession,
      readCatalog,
      getMountedWorkspaceRoot: ensureWorkspaceMounted
    })
  })
}
