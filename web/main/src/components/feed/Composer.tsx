'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { unstable_serialize } from 'swr/infinite'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { createPostAction, type CreatePostState } from '@/lib/actions/posts'
import type { PhotoDTO, UserSummaryDTO } from '@/lib/dal/dto'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/UserAvatar'
import { getFeedKey } from './feed-key'

// Keep in sync with MAX_PHOTOS_PER_POST / MAX_PHOTO_BYTES in lib/photos.ts
// (server-only); the server enforces both regardless.
const MAX_PHOTOS = 10
const MAX_PHOTO_MB = 20

type PendingPhoto = {
  key: string
  previewUrl: string
  status: 'uploading' | 'done' | 'error'
  mediaId?: string
  error?: string
}

async function uploadPhoto(file: File): Promise<PhotoDTO> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/media', { method: 'POST', body })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error ?? `Upload failed (${res.status})`)
  return json as PhotoDTO
}

/**
 * New-post form. Photos upload as soon as they're picked (POST /api/media),
 * so by the time you press Post only their IDs go with the text. On success
 * the feed is revalidated through SWR.
 */
export function Composer({
  viewer,
  circleId,
}: {
  viewer: UserSummaryDTO
  circleId: string
}) {
  const { mutate } = useSWRConfig()
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  // Free preview object URLs when the component unmounts.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(
    () => () =>
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)),
    [],
  )

  const [state, formAction, isPending] = useActionState<
    CreatePostState,
    FormData
  >(async (prev, formData) => {
    const result = await createPostAction(prev, formData)
    if (result?.ok) {
      setBody('')
      setPhotos((current) => {
        current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return []
      })
      await mutate(unstable_serialize(getFeedKey(circleId)))
    }
    return result
  }, null)

  function addFiles(files: FileList | null) {
    if (!files) return
    const room = MAX_PHOTOS - photos.length
    const picked = Array.from(files).slice(0, Math.max(room, 0))
    for (const file of picked) {
      const key = crypto.randomUUID()
      const previewUrl = URL.createObjectURL(file)
      const update = (patch: Partial<PendingPhoto>) =>
        setPhotos((current) =>
          current.map((p) => (p.key === key ? { ...p, ...patch } : p)),
        )
      setPhotos((current) => [
        ...current,
        { key, previewUrl, status: 'uploading' },
      ])
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        update({ status: 'error', error: `Over ${MAX_PHOTO_MB} MB` })
        continue
      }
      uploadPhoto(file)
        .then((photo) => update({ status: 'done', mediaId: photo.id }))
        .catch((e: Error) => update({ status: 'error', error: e.message }))
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const photo = current.find((p) => p.key === key)
      if (photo) URL.revokeObjectURL(photo.previewUrl)
      return current.filter((p) => p.key !== key)
    })
  }

  const uploading = photos.some((p) => p.status === 'uploading')
  const failed = photos.some((p) => p.status === 'error')
  const ready = photos.filter((p) => p.status === 'done')
  const canPost =
    !isPending &&
    !uploading &&
    !failed &&
    (body.trim() !== '' || ready.length > 0)

  return (
    <form
      action={formAction}
      className="rounded-lg border border-border bg-card p-4 shadow-xs"
    >
      <input type="hidden" name="circleId" value={circleId} />
      {ready.map((p) => (
        <input key={p.key} type="hidden" name="mediaId" value={p.mediaId} />
      ))}

      <div className="flex gap-3">
        <UserAvatar user={viewer} />
        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`What's on your mind, ${viewer.name.split(' ')[0]}?`}
          aria-invalid={state?.ok === false || undefined}
          disabled={isPending}
          maxLength={5000}
        />
      </div>

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-5 gap-2" aria-label="Photos to post">
          {photos.map((p) => (
            <li
              key={p.key}
              className="relative aspect-square overflow-hidden rounded-md bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="size-full object-cover"
              />
              {p.status === 'uploading' && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  <Loader2
                    className="size-5 animate-spin"
                    aria-label="Uploading"
                  />
                </span>
              )}
              {p.status === 'error' && (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-1 text-center text-[10px] leading-tight text-destructive-foreground"
                  title={p.error}
                >
                  {p.error}
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.key)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending || photos.length >= MAX_PHOTOS}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus />
          Photo
        </Button>
        {photos.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {photos.length}/{MAX_PHOTOS}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {state?.ok === false && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {failed && !state && (
            <p className="text-sm text-destructive">
              Remove photos that failed to upload.
            </p>
          )}
          <Button type="submit" size="md" disabled={!canPost}>
            {isPending ? 'Posting…' : uploading ? 'Uploading…' : 'Post'}
          </Button>
        </div>
      </div>
    </form>
  )
}
