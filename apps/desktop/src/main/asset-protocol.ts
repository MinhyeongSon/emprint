import { net, protocol } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { hasPathTraversalSegment } from '@emprint/shared'
import { getMountedWorkspaceRoot } from './ipc'
import { WORKSPACE_DIR } from '@emprint/shared'

export const ASSET_PROTOCOL = 'emprint-asset'

/**
 * Register the asset protocol as a standard, secure, fetch-supported scheme.
 * Must be called BEFORE app.whenReady() resolves.
 */
export function registerAssetProtocolPrivilege(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true,
        stream: true
      }
    }
  ])
}

/**
 * Resolve `emprint-asset://...` requests to files inside the currently mounted workspace.
 *
 * Pathing scheme:
 * - `emprint-asset://assets/images/foo.jpg` → `<workspaceRoot>/assets/images/foo.jpg`
 * - `emprint-asset:///assets/images/foo.jpg` (leading slash form) is also accepted for
 *   parity with markdown root-relative paths.
 *
 * Refuses anything outside `assets/`.
 */
export function registerAssetProtocolHandler(): void {
  protocol.handle(ASSET_PROTOCOL, (request) => {
    const workspaceRoot = getMountedWorkspaceRoot()
    if (!workspaceRoot) {
      return new Response('Workspace not mounted', { status: 503 })
    }

    let parsed: URL
    try {
      parsed = new URL(request.url)
    } catch {
      return new Response('Invalid URL', { status: 400 })
    }

    // Build a single POSIX-style path from host + pathname so both forms work.
    const raw = `${parsed.host ?? ''}/${parsed.pathname ?? ''}`
    const normalized = decodeURIComponent(raw)
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '')

    if (!normalized || hasPathTraversalSegment(normalized)) {
      return new Response('Forbidden', { status: 403 })
    }

    const underAssets =
      normalized === WORKSPACE_DIR.assets || normalized.startsWith(`${WORKSPACE_DIR.assets}/`)
    const underArtwork =
      normalized === WORKSPACE_DIR.artwork || normalized.startsWith(`${WORKSPACE_DIR.artwork}/`)
    if (!underAssets && !underArtwork) {
      return new Response('Forbidden', { status: 403 })
    }

    const abs = path.resolve(workspaceRoot, ...normalized.split('/'))
    const contentRoot = path.resolve(
      workspaceRoot,
      underArtwork ? WORKSPACE_DIR.artwork : WORKSPACE_DIR.assets
    )
    const rel = path.relative(contentRoot, abs)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(abs).toString())
  })
}
