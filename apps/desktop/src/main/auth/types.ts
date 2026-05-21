import type {
  GitHubAuthStatus,
  GitHubDeviceCode,
  GitHubOAuthClientConfig,
  GitHubRepoCreateInput,
  GitHubRepoCreateResult
} from '@emprint/shared'

/** Remote/git hosts with OAuth + repo APIs (extensible). */
export type AuthProviderId = 'github' | 'gitlab'

export type StoredAuthSession = {
  accessToken: string
  login: string
  createdAt: string
}

/**
 * OAuth + session for a single host (GitHub today, GitLab later).
 * Hosting APIs (repo create, deploy) live on HostingProvider.
 */
export interface AuthProvider {
  readonly id: AuthProviderId
  readonly displayName: string
  oauthClientGet(): Promise<GitHubOAuthClientConfig>
  oauthClientSet(input: { clientId: string; clientSecret?: string }): Promise<GitHubOAuthClientConfig>
  authStatus(): Promise<GitHubAuthStatus>
  authStart(input: { scopes: string[] }): Promise<GitHubDeviceCode>
  authPoll(input: { deviceCode: string }): Promise<GitHubAuthStatus>
  logout(): Promise<void>
  readSession(): Promise<StoredAuthSession | null>
}

export interface HostingProvider {
  readonly id: AuthProviderId
  repoCreate(input: GitHubRepoCreateInput): Promise<GitHubRepoCreateResult>
}
