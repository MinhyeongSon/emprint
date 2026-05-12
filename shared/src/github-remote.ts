/** Strip trailing `.git` (any case). */
function stripDotGit(name: string): string {
  return name.replace(/\.git$/i, '')
}

/**
 * Parse `owner` and `repo` from a GitHub HTTPS or SSH remote URL.
 * Returns null if the URL is not a github.com repository remote.
 */
export function parseGithubRepoFromRemoteUrl(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim()
  if (!trimmed) return null

  const ssh = /^git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/i.exec(trimmed)
  if (ssh?.[1] && ssh[2]) {
    return { owner: ssh[1], repo: stripDotGit(ssh[2]) }
  }

  try {
    const u = new URL(trimmed)
    const host = u.hostname.toLowerCase()
    if (host !== 'github.com' && host !== 'www.github.com') return null
    const segments = u.pathname.split('/').filter(Boolean)
    const owner = segments[0]
    const repoSeg = segments[1]
    if (!owner || !repoSeg) return null
    return { owner, repo: stripDotGit(repoSeg) }
  } catch {
    return null
  }
}
