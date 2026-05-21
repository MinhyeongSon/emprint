import type { GitRemoteProviderId } from '@emprint/shared'

export interface CloneWorkspaceOptions {
  remoteUrl: string
  directory: string
  defaultBranch?: string
}

/**
 * Bootstrap-only git surface. Day-to-day publish/pull stay in the desktop shell
 * until a second provider implementation justifies a wider abstraction.
 */
export interface GitProvider {
  clone(options: CloneWorkspaceOptions): Promise<void>
  init(directory: string): Promise<void>
  addRemote(directory: string, remoteName: string, remoteUrl: string): Promise<void>
}

export interface GitProviderFactory {
  create(providerId: GitRemoteProviderId): GitProvider
}
