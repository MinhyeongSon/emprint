/**
 * Asset path conventions
 * ----------------------
 * Markdown ON DISK:
 *   ![alt](/assets/images/foo.jpg)   ← root-relative POSIX path (portable for static sites)
 *
 * Editor & preview IN APP:
 *   ![alt](emprint-asset://assets/images/foo.jpg)
 *   The main process maps this custom scheme to `<workspaceRoot>/assets/...` for fetch.
 *
 * These helpers translate between the two so the on-disk file stays portable while the
 * in-app editor can actually render the image.
 */

export const ASSET_SCHEME = 'emprint-asset'

const ASSET_PATH_PREFIX = 'assets/'

/** Convert a workspace-relative asset path (`assets/images/x.jpg`) to its in-app URL. */
export function workspaceAssetPathToAssetUrl(path: string): string {
  const clean = path.replace(/^\/+/, '')
  return `${ASSET_SCHEME}://${clean}`
}

/** Convert a workspace-relative asset path to its on-disk markdown form (root-relative). */
export function workspaceAssetPathToMarkdownPath(path: string): string {
  const clean = path.replace(/^\/+/, '')
  return `/${clean}`
}

/**
 * Transform a markdown body for display in the editor: rewrite any `/assets/...`
 * references inside `![alt](...)` and `<img src="..." />` tags to use the
 * `emprint-asset://` scheme so the editor can resolve them via our protocol.
 */
export function rewriteAssetUrlsForEditor(markdown: string): string {
  let result = markdown.replace(
    /(!\[[^\]]*\]\()(\/?assets\/[^)\s]+)((?:\s+"[^"]*")?\))/g,
    (_, prefix: string, urlPart: string, suffix: string) => {
      const clean = urlPart.replace(/^\/+/, '')
      return `${prefix}${ASSET_SCHEME}://${clean}${suffix}`
    }
  )
  result = result.replace(/(<img[^>]+src\s*=\s*["'])(\/?assets\/[^"']+)(["'][^>]*>)/gi, (_, p1, p2, p3) => {
    const clean = (p2 as string).replace(/^\/+/, '')
    return `${p1}${ASSET_SCHEME}://${clean}${p3}`
  })
  return result
}

/**
 * Inverse of `rewriteAssetUrlsForEditor`: strip the `emprint-asset://` scheme back to
 * root-relative paths suitable for serialization to disk.
 */
export function rewriteAssetUrlsForDisk(markdown: string): string {
  const schemeMd = new RegExp(`(!\\[[^\\]]*\\]\\()${ASSET_SCHEME}:\\/\\/+([^)\\s]+)((?:\\s+"[^"]*")?\\))`, 'g')
  let result = markdown.replace(schemeMd, (_, prefix: string, urlPart: string, suffix: string) => {
    const clean = urlPart.replace(/^\/+/, '')
    return `${prefix}/${clean}${suffix}`
  })
  const schemeHtml = new RegExp(`(<img[^>]+src\\s*=\\s*["'])${ASSET_SCHEME}:\\/\\/+([^"']+)(["'][^>]*>)`, 'gi')
  result = result.replace(schemeHtml, (_, p1, p2: string, p3) => {
    const clean = p2.replace(/^\/+/, '')
    return `${p1}/${clean}${p3}`
  })
  return result
}

/** True if the given URL points at an in-workspace asset (either form). */
export function isWorkspaceAssetUrl(url: string): boolean {
  if (url.startsWith(`${ASSET_SCHEME}://`)) return true
  const stripped = url.replace(/^\.\//, '').replace(/^\/+/, '')
  return stripped.startsWith(ASSET_PATH_PREFIX)
}
