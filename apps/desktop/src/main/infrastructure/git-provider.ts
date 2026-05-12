import type { GitRemoteProviderId } from '@emprint/shared'

export interface CloneWorkspaceOptions {
  remoteUrl: string
  directory: string
  defaultBranch?: string
}

/**
 * Bootstrap-only git surface. Day-to-day operations (status, commit, push,
 * publish) are handled inline via `simple-git` in the main IPC layer because
 * they need to talk to GitHub auth, retry on auth failures, and report
 * progress; abstracting them behind this interface would add ceremony without
 * a second provider implementation.
 */
export interface GitProvider {
  clone(options: CloneWorkspaceOptions): Promise<void>
  init(directory: string): Promise<void>
  addRemote(directory: string, remoteName: string, remoteUrl: string): Promise<void>
}

export interface GitProviderFactory {
  create(providerId: GitRemoteProviderId): GitProvider
}
