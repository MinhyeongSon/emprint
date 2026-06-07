import sharp from 'sharp'
import { MAX_ASSET_IMAGE_BYTES } from '@emprint/shared'

const JPEG_QUALITY = 85
const MAX_ARTWORK_DIMENSION = 2400

/**
 * Accept JPEG, PNG, WebP, and other raster formats sharp understands; always emit
 * a compressed JPEG suitable for Fragments `artwork/` (public sites serve `.jpg`).
 */
export async function encodeArtworkAsJpeg(input: {
  data: Uint8Array
  fileName: string
}): Promise<{ bytes: Buffer; mimeType: 'image/jpeg' }> {
  const buf = Buffer.from(input.data)
  if (buf.byteLength > MAX_ASSET_IMAGE_BYTES) {
    throw new Error(
      `Image exceeds the 20MB upload limit (${(buf.byteLength / (1024 * 1024)).toFixed(1)}MB).`
    )
  }
  if (buf.byteLength === 0) {
    throw new Error('Empty image data.')
  }

  try {
    const out = await sharp(buf, { failOn: 'none' })
      .rotate()
      .resize({
        width: MAX_ARTWORK_DIMENSION,
        height: MAX_ARTWORK_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer()

    return { bytes: out, mimeType: 'image/jpeg' }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Failed to process image.'
    throw new Error(message)
  }
}
