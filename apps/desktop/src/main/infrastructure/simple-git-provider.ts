import simpleGit from 'simple-git'
import type { CloneWorkspaceOptions, GitProvider, GitProviderFactory } from './git-provider'
import type { GitRemoteProviderId } from '@emprint/shared'

let gitBinary: string | undefined

export function setGitBinaryPath(path?: string): void {
  gitBinary = path
}

function gitClient(directory?: string) {
  return simpleGit({
    ...(directory ? { baseDir: directory } : {}),
    ...(gitBinary ? { binary: gitBinary } : {})
  })
}

export class SimpleGitProvider implements GitProvider {
  async clone(options: CloneWorkspaceOptions): Promise<void> {
    const args = options.defaultBranch ? ['--branch', options.defaultBranch] : []
    await gitClient().clone(options.remoteUrl, options.directory, args)
  }

  async init(directory: string): Promise<void> {
    await gitClient(directory).init()
  }

  async addRemote(directory: string, remoteName: string, remoteUrl: string): Promise<void> {
    const git = gitClient(directory)
    const remotes = await git.getRemotes(true)

    if (remotes.some((remote) => remote.name === remoteName)) {
      return
    }

    await git.addRemote(remoteName, remoteUrl)
  }
}

export class SimpleGitProviderFactory implements GitProviderFactory {
  create(_providerId: GitRemoteProviderId): GitProvider {
    return new SimpleGitProvider()
  }
}
