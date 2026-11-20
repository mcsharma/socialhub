import { NextResponse } from 'next/server'
import { createPhotoMedia } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { getViewerCircle } from '@/lib/dal/circles'
import { toPhotoDTO } from '@/lib/dal/posts'
import type { PhotoDTO } from '@/lib/dal/dto'
import {
  MAX_PHOTO_BYTES,
  processAndStorePhoto,
  UnsupportedPhotoError,
} from '@/lib/photos'

/**
 * POST /api/media — upload one photo (multipart field `file`). The composer
 * calls this once per photo as soon as it's picked, then sends the returned
 * IDs with the post.
 *
 * Photos come through the app server, not straight to storage, because the
 * server has to read every byte anyway to strip metadata and resize. A
 * Route Handler (not a Server Action) because actions cap bodies at 1 MB.
 *
 * Photos that never get attached to a post stay in storage; a cleanup job
 * for those is still to do.
 */
export async function POST(request: Request) {
  const viewer = await getViewer()
  if (!viewer) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }
  if (!(await getViewerCircle())) {
    return NextResponse.json(
      { error: 'Join a circle to share photos.' },
      { status: 403 },
    )
  }

  const tooLarge = NextResponse.json(
    { error: `Photos must be under ${MAX_PHOTO_BYTES / 1024 / 1024} MB.` },
    { status: 413 },
  )
  // Reject oversized bodies before buffering them (multipart adds a little).
  if (Number(request.headers.get('content-length')) > MAX_PHOTO_BYTES + 64_000)
    return tooLarge

  let file: FormDataEntryValue | null
  try {
    file = (await request.formData()).get('file')
  } catch {
    return NextResponse.json(
      { error: 'Expected a form upload.' },
      { status: 400 },
    )
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }
  if (file.size > MAX_PHOTO_BYTES) return tooLarge

  let stored: Awaited<ReturnType<typeof processAndStorePhoto>>
  try {
    stored = await processAndStorePhoto(Buffer.from(await file.arrayBuffer()))
  } catch (error) {
    if (error instanceof UnsupportedPhotoError) {
      return NextResponse.json({ error: error.message }, { status: 415 })
    }
    throw error
  }

  const media = await createPhotoMedia({ uploaderId: viewer.id, ...stored })
  return NextResponse.json<PhotoDTO>(await toPhotoDTO(media), { status: 201 })
}
