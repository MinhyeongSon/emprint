import path from 'node:path'
import type { GitHubDeployStatus, GitInitialSyncResult, GitPublishResult } from '@emprint/shared'
import { isQaMockAuthEnabled } from '../auth/qa/env.js'

/** Workspace root returned by `system:select-directory` during QA (wizard step 4). */
export function qaWorkspaceRootOverride(): string | undefined {
  const raw = process.env.EMPRINT_QA_WORKSPACE_ROOT?.trim()
  return raw ? path.resolve(raw) : undefined
}

export function isQaMockGitPushEnabled(): boolean {
  if (process.env.EMPRINT_QA_MOCK_PUSH === '0') return false
  if (process.env.EMPRINT_QA_MOCK_PUSH === '1') return true
  return isQaMockAuthEnabled()
}

export function mockGitPushResult(branch = 'main'): GitPublishResult {
  return {
    committed: true,
    pushed: true,
    branch,
    pushedTo: 'https://github.com/qa-mock-user/qa-mock-repo.git'
  }
}

export function mockGitInitialSyncResult(branch = 'main'): GitInitialSyncResult {
  return { committed: true, pushed: true, branch }
}

export function mockGithubDeployStatus(): GitHubDeployStatus {
  const login = process.env.EMPRINT_QA_MOCK_LOGIN?.trim() || 'qa-mock-user'
  const repo = process.env.EMPRINT_QA_MOCK_REPO?.trim() || 'qa-mock-repo'
  return {
    phase: 'live',
    pagesUrl: `https://${login}.github.io/${repo}/`,
    workflowName: 'Deploy Astro site to GitHub Pages (QA mock)',
    message: 'QA mock deploy status'
  }
}
