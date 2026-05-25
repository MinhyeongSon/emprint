import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SitePublicConfig } from '@emprint/shared'
import { readGithubSession } from '../auth'

const SITE_JSON_RELATIVE = 'config/site.json'

/** Write GitHub login into site.json for Astro footer © line. */
export async function syncSiteCopyrightHolder(workspaceRoot: string): Promise<void> {
  const session = await readGithubSession()
  const login = session?.login?.trim()
  if (!login) return

  const sitePath = path.join(workspaceRoot, SITE_JSON_RELATIVE)
  let config: SitePublicConfig
  try {
    const raw = await readFile(sitePath, 'utf8')
    config = JSON.parse(raw) as SitePublicConfig
  } catch {
    return
  }

  if (config.copyrightHolder === login) return

  await writeFile(
    sitePath,
    `${JSON.stringify({ ...config, copyrightHolder: login }, null, 2)}\n`,
    'utf8'
  )
}
