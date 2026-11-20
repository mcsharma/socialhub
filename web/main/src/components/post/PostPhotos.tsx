import type { PhotoDTO } from '@/lib/dal/dto'
import { cn } from '@/lib/utils'

const MAX_TILES = 4

/**
 * Photo grid: one photo at its own aspect ratio, several as a 2-column grid
 * of square tiles (up to 4, the last showing "+N" for the rest). Each tile
 * opens the full-size image.
 *
 * Plain <img> rather than next/image: photos are already resized at upload,
 * and their signed URLs come from private storage.
 */
export function PostPhotos({ photos }: { photos: PhotoDTO[] }) {
  if (photos.length === 0) return null

  if (photos.length === 1) {
    const photo = photos[0]!
    return (
      <a
        href={photo.fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-md bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt=""
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="max-h-[560px] w-full object-cover"
        />
      </a>
    )
  }

  const shown = photos.slice(0, MAX_TILES)
  const hidden = photos.length - shown.length
  return (
    <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-md">
      {shown.map((photo, i) => {
        const isLast = i === shown.length - 1
        return (
          <a
            key={photo.id}
            href={photo.fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'relative block aspect-square bg-muted',
              shown.length === 3 && i === 0 && 'col-span-2 aspect-[2/1]',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
            {isLast && hidden > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-2xl font-semibold text-white">
                +{hidden}
              </span>
            )}
          </a>
        )
      })}
    </div>
  )
}
