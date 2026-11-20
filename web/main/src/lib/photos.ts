import 'server-only'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { putObject } from './storage'

export const MAX_PHOTOS_PER_POST = 10
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024 // 20 MB

/**
 * Stored sizes. Each photo is resized once at upload, not per request:
 * `feed` fits the 680px feed column at ~1.5x density, `full` is for viewing
 * a photo on its own.
 */
const SIZES = { feed: 1080, full: 2048 } as const
export type PhotoSize = keyof typeof SIZES

// HEIC (iPhone's default) isn't decodable by sharp's prebuilt libvips, but
// iOS converts to JPEG when a web page asks for "image/*".
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff'])

export class UnsupportedPhotoError extends Error {}

export const photoObjectKey = (storageKey: string, size: PhotoSize) =>
  `${storageKey}/${SIZES[size]}.webp`

/**
 * Validates, cleans and stores an uploaded photo:
 * - decodes it (rejecting anything that isn't a supported image),
 * - rotates it upright from its EXIF orientation,
 * - drops all metadata — EXIF from phones includes GPS location,
 * - writes WebP files at each size under a random, unguessable key.
 * Animated GIFs keep only their first frame.
 */
export async function processAndStorePhoto(input: Buffer) {
  let format: string | undefined
  try {
    format = (await sharp(input).metadata()).format
  } catch {
    throw new UnsupportedPhotoError('That file isn’t an image we can read.')
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new UnsupportedPhotoError(
      `${format?.toUpperCase() ?? 'This'} images aren’t supported. Use JPEG, PNG, WebP, GIF or AVIF.`,
    )
  }

  // sharp drops metadata unless .keepMetadata()/.withMetadata() is called.
  const upright = sharp(input).rotate()
  const storageKey = `photos/${randomBytes(16).toString('hex')}`

  const outputs = await Promise.all(
    (Object.keys(SIZES) as PhotoSize[]).map(async (size) => {
      const { data, info } = await upright
        .clone()
        .resize({
          width: SIZES[size],
          height: SIZES[size],
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      await putObject(photoObjectKey(storageKey, size), data, 'image/webp')
      return { size, info }
    }),
  )

  const full = outputs.find((o) => o.size === 'full')!.info
  return {
    storageKey,
    mimeType: 'image/webp',
    width: full.width,
    height: full.height,
    sizeBytes: full.size,
  }
}
