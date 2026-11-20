'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { createPost } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { profileTag } from '@/lib/dal/users'

// Server Actions are public HTTP endpoints under the hood — always
// re-authenticate and re-validate here, never trust the calling component.

const CreatePostInput = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write something first.')
    .max(5000, 'Keep it under 5000 characters.'),
})

export type CreatePostState = { ok: true } | { ok: false; error: string } | null

export async function createPostAction(
  _prev: CreatePostState,
  formData: FormData,
): Promise<CreatePostState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Sign in to post.' }

  const parsed = CreatePostInput.safeParse({ body: formData.get('body') })
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]!.message }

  await createPost({ authorId: viewer.id, body: parsed.data.body })

  // The author's cached profile (post count) is now stale. updateTag =
  // read-your-own-writes: the next render waits for fresh data instead of
  // serving stale-while-revalidate.
  updateTag(profileTag(viewer.username))

  // The home feed isn't cached server-side at all; the client re-fetches it
  // via SWR after this resolves (see Composer).
  return { ok: true }
}
