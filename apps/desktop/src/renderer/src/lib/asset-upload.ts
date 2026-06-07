import type { AssetImageInfo } from '@emprint/shared'
import { compressImage, isSupportedImageMime, MAX_ASSET_IMAGE_BYTES } from '@renderer/lib/image-compress'

export async function uploadWorkspaceAssetFiles(
  files: File[]
): Promise<{ saved: AssetImageInfo[]; errors: string[] }> {
  if (!window.emprint?.assets?.saveImage) {
    return { saved: [], errors: ['Asset API unavailable.'] }
  }

  const saved: AssetImageInfo[] = []
  const errors: string[] = []

  for (const file of files) {
    if (!isSupportedImageMime(file.type)) {
      errors.push(`Unsupported image type: ${file.name}`)
      continue
    }
    if (file.size > MAX_ASSET_IMAGE_BYTES) {
      errors.push(
        `"${file.name}" exceeds the 20MB upload limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      )
      continue
    }

    try {
      const compressed = await compressImage(file, file.name)
      const info = await window.emprint.assets.saveImage({
        fileName: compressed.fileName,
        data: compressed.bytes,
        mimeType: compressed.mimeType
      })
      saved.push(info)
    } catch (caught) {
      errors.push(caught instanceof Error ? caught.message : `Failed to upload ${file.name}`)
    }
  }

  return { saved, errors }
}
