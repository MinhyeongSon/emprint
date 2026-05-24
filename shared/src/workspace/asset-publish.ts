import type { AssetPublishScope, AssetReference } from '../types'

/** Classify whether an image should be included in the publish commit. */
export function classifyAssetPublishScope(references: AssetReference[]): AssetPublishScope {
  if (references.length === 0) return 'orphan'
  if (references.some((ref) => ref.section === 'posts' || ref.section === 'knowledge')) return 'published'
  return 'draft-only'
}

export function isNonPublishableAssetScope(scope: AssetPublishScope): boolean {
  return scope !== 'published'
}

/** Normalize git status paths for comparison with workspace-relative asset paths. */
export function normalizePublishPendingPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/^\/+/, '')
}

/** True when a working-tree path should be hidden from the publish UI. */
export function isNonPublishableAssetPendingPath(
  filePath: string,
  nonPublishableAssetPaths: Set<string> | undefined
): boolean {
  if (!nonPublishableAssetPaths?.size) return false
  const normalized = normalizePublishPendingPath(filePath)
  if (nonPublishableAssetPaths.has(normalized)) return true
  const base = normalized.split('/').pop()
  if (!base) return false
  for (const candidate of nonPublishableAssetPaths) {
    const norm = normalizePublishPendingPath(candidate)
    if (norm === normalized || norm.endsWith(`/${base}`) || normalized.endsWith(`/${norm.split('/').pop()!}`)) {
      return true
    }
  }
  return false
}
