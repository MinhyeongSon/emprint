import type {
  GitHubAuthStatus,
  GitHubDeviceCode,
  GitHubOAuthClientConfig,
  GitHubRepoCreateInput,
  GitHubRepoCreateResult
} from '@emprint/shared'
import { readGithubSession } from '../providers/github/index.js'
import type { AuthProvider, AuthProviderId, HostingProvider } from '../types.js'

const MOCK_LOGIN = process.env.EMPRINT_QA_MOCK_LOGIN?.trim() || 'qa-mock-user'
const MOCK_CLIENT_ID = process.env.EMPRINT_QA_MOCK_CLIENT_ID?.trim() || 'qa-mock-client-id'

function wrapRealAuth(real: AuthProvider, id: AuthProviderId): AuthProvider {
  return {
    id,
    displayName: `${real.displayName} (QA mock)`,

    async oauthClientGet(): Promise<GitHubOAuthClientConfig> {
      const fromDisk = await real.oauthClientGet()
      return {
        clientId: fromDisk.clientId ?? MOCK_CLIENT_ID,
        hasClientSecret: true
      }
    },

    async oauthClientSet(input) {
      return real.oauthClientSet(input)
    },

    async authStatus(): Promise<GitHubAuthStatus> {
      const session = await real.readSession()
      if (session) {
        return { connected: true, login: session.login }
      }
      return { connected: true, login: MOCK_LOGIN }
    },

    async authStart(): Promise<GitHubDeviceCode> {
      return {
        deviceCode: 'qa-mock-device-code',
        userCode: 'QA-MOCK',
        verificationUri: 'https://example.com/qa-mock-oauth',
        expiresIn: 900,
        interval: 5
      }
    },

    async authPoll(): Promise<GitHubAuthStatus> {
      return { connected: true, login: MOCK_LOGIN }
    },

    async logout() {
      await real.logout()
    },

    readSession: real.readSession
  }
}

export function createQaMockAuthProvider(real: AuthProvider): AuthProvider {
  return wrapRealAuth(real, real.id)
}

export function mockGithubRepoCreate(input: GitHubRepoCreateInput): GitHubRepoCreateResult {
  const owner = input.owner.trim() || MOCK_LOGIN
  const name = input.name.trim() || 'qa-mock-repo'
  const fullName = `${owner}/${name}`
  return {
    fullName,
    htmlUrl: `https://github.com/${fullName}`,
    cloneUrl: `https://github.com/${fullName}.git`,
    sshUrl: `git@github.com:${fullName}.git`,
    defaultBranch: 'main',
    pagesAutoEnabled: true
  }
}

export function createQaMockHostingProvider(real: HostingProvider): HostingProvider {
  return {
    id: real.id,
    async repoCreate(input) {
      if (process.env.EMPRINT_QA_MOCK_REPO_NETWORK === '1') {
        return real.repoCreate(input)
      }
      return mockGithubRepoCreate(input)
    }
  }
}

/** Session seeded into userData by emprint-qa (optional). */
export async function qaMockSessionLogin(): Promise<string | undefined> {
  const session = await readGithubSession()
  return session?.login
}
