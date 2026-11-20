'use server'

import { z } from 'zod'
import { createPost, parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { isViewerInCircle } from '@/lib/dal/circles'
import { MAX_PHOTOS_PER_POST } from '@/lib/photos'

export type CreatePostState = { ok: true } | { ok: false; error: string } | null

const CreatePostInput = z.object({
  circleId: z.string(),
  body: z.string().trim().max(5000, 'Keep it under 5000 characters.'),
  mediaIds: z
    .array(z.string())
    .max(MAX_PHOTOS_PER_POST, `Up to ${MAX_PHOTOS_PER_POST} photos per post.`),
})

export async function createPostAction(
  _prev: CreatePostState,
  formData: FormData,
): Promise<CreatePostState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Sign in to post.' }

  const input = CreatePostInput.safeParse({
    circleId: formData.get('circleId'),
    body: formData.get('body') ?? '',
    mediaIds: formData.getAll('mediaId'),
  })
  if (!input.success) {
    return { ok: false, error: input.error.issues[0]!.message }
  }
  const circleId = parseSnowflake(input.data.circleId)
  if (circleId === null || !(await isViewerInCircle(circleId))) {
    return { ok: false, error: 'Circle not found.' }
  }
  const mediaIds = input.data.mediaIds.map(parseSnowflake)
  if (mediaIds.some((id) => id === null)) {
    return { ok: false, error: 'Invalid photo.' }
  }
  const body = input.data.body || null
  if (!body && mediaIds.length === 0) {
    return { ok: false, error: 'Write something or add a photo.' }
  }

  const post = await createPost({
    authorId: viewer.id,
    circleId,
    body,
    mediaIds: mediaIds as bigint[],
  })
  if (!post) {
    return {
      ok: false,
      error: 'Some photos couldn’t be attached. Remove them and upload again.',
    }
  }
  // The feed isn't cached on the server; the client re-fetches it via SWR
  // after this resolves (see Composer).
  return { ok: true }
}
