import { MAX_ASSET_IMAGE_BYTES } from '@emprint/shared'

export { MAX_ASSET_IMAGE_BYTES }

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
] as const

export type SupportedImageMime = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number]

export interface CompressedImage {
  /** Reasonable suggested file name (no path). */
  fileName: string
  bytes: Uint8Array
  mimeType: SupportedImageMime
}

export interface CompressImageOptions {
  /** Largest dimension after resize. Aspect ratio is preserved. */
  maxDimension?: number
  /** JPEG / WebP quality in [0, 1]. PNG ignores this. */
  quality?: number
}

const DEFAULT_MAX_DIMENSION = 2048
const DEFAULT_QUALITY = 0.85

export function isSupportedImageMime(mime: string): mime is SupportedImageMime {
  return (SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}

/**
 * Compress a raster image by re-encoding through a canvas. Non-raster formats
 * (SVG, GIF) are passed through unchanged so we don't lose vector data or animation.
 * Callers MUST already have rejected files above the 20MB limit; this function
 * additionally guards as a safety net.
 */
export async function compressImage(
  file: File | Blob,
  fileNameInput: string,
  opts: CompressImageOptions = {}
): Promise<CompressedImage> {
  const mime = file.type || guessMimeFromName(fileNameInput) || 'application/octet-stream'
  if (!isSupportedImageMime(mime)) {
    throw new Error(`Unsupported image type: ${mime || 'unknown'}`)
  }
  if (file.size > MAX_ASSET_IMAGE_BYTES) {
    throw new Error(
      `Image exceeds the 20MB upload limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
    )
  }

  // Vector + animated: pass through.
  if (mime === 'image/svg+xml' || mime === 'image/gif') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    return {
      fileName: ensureExt(fileNameInput, mime),
      bytes,
      mimeType: mime
    }
  }

  const maxDim = opts.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = opts.quality ?? DEFAULT_QUALITY

  const bitmap = await createBitmapFromBlob(file)
  const { width: srcW, height: srcH } = bitmap
  const longest = Math.max(srcW, srcH)
  const scale = longest > maxDim ? maxDim / longest : 1
  const targetW = Math.max(1, Math.round(srcW * scale))
  const targetH = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is not available.')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  if (typeof (bitmap as ImageBitmap).close === 'function') {
    ;(bitmap as ImageBitmap).close()
  }

  // PNG: keep PNG to preserve transparency (no quality control here, but resize
  // already buys most of the savings). Everything else: JPEG with quality.
  const targetMime: SupportedImageMime = mime === 'image/png' ? 'image/png' : 'image/jpeg'

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (out) => (out ? resolve(out) : reject(new Error('Failed to encode image.'))),
      targetMime,
      targetMime === 'image/png' ? undefined : quality
    )
  })

  const bytes = new Uint8Array(await blob.arrayBuffer())
  return {
    fileName: ensureExt(fileNameInput, targetMime),
    bytes,
    mimeType: targetMime
  }
}

async function createBitmapFromBlob(blob: Blob): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob)
    } catch {
      // fall back to <img> path below
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to decode image.'))
    }
    img.src = url
  })
}

function ensureExt(name: string, mime: SupportedImageMime): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '')
  const ext = extForMime(mime)
  return `${base}.${ext}`
}

function extForMime(mime: SupportedImageMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/svg+xml':
      return 'svg'
  }
}

function guessMimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return ''
  }
}
