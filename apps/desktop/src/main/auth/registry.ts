import { isQaMockAuthEnabled } from './qa/env'
import { createQaMockAuthProvider, mockGithubRepoCreate } from './qa/mock-provider'
import { githubAuthProvider } from './providers/github'
import type { AuthProvider, AuthProviderId, HostingProvider } from './types'
import type { GitHubRepoCreateInput, GitHubRepoCreateResult } from '@emprint/shared'

export type { AuthProviderId } from './types'

const providers: Partial<Record<AuthProviderId, AuthProvider>> = {
  github: githubAuthProvider
}

export function getAuthProvider(id: AuthProviderId): AuthProvider {
  const real = providers[id]
  if (!real) {
    throw new Error(`Unsupported auth provider: ${id}`)
  }
  if (isQaMockAuthEnabled()) {
    return createQaMockAuthProvider(real)
  }
  return real
}

/** Hosting (repo create, deploy). GitHub impl delegates to ipc until fully extracted. */
type RepoCreateFn = (input: GitHubRepoCreateInput) => Promise<GitHubRepoCreateResult>

let githubRepoCreateImpl: RepoCreateFn | null = null

export function registerGithubRepoCreate(impl: RepoCreateFn): void {
  githubRepoCreateImpl = impl
}

const githubHosting: HostingProvider = {
  id: 'github',
  async repoCreate(input) {
    if (!githubRepoCreateImpl) {
      throw new Error('GitHub repo create handler not registered.')
    }
    return githubRepoCreateImpl(input)
  }
}

export function getHostingProvider(id: AuthProviderId): HostingProvider {
  if (id !== 'github') {
    throw new Error(`Unsupported hosting provider: ${id}`)
  }
  if (isQaMockAuthEnabled()) {
    return {
      id: 'github',
      repoCreate: async (input) => mockGithubRepoCreate(input)
    }
  }
  return githubHosting
}

export function listAuthProviderIds(): AuthProviderId[] {
  return Object.keys(providers) as AuthProviderId[]
}
