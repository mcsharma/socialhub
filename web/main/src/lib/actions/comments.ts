'use server'

import { z } from 'zod'
import { createComment, getPostCounts, parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { canViewerAccessPost, toCommentDTO } from '@/lib/dal/posts'
import type { CommentDTO } from '@/lib/dal/dto'

export type AddCommentResult =
  | { ok: true; comment: CommentDTO; commentCount: number }
  | { ok: false; error: string }

const CommentInput = z.object({
  postId: z.string(),
  body: z
    .string()
    .trim()
    .min(1, 'Write a comment first.')
    .max(2000, 'Keep it under 2000 characters.'),
})

export async function addCommentAction(
  postId: string,
  body: string,
): Promise<AddCommentResult> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Sign in to comment.' }
  const input = CommentInput.safeParse({ postId, body })
  if (!input.success) {
    return { ok: false, error: input.error.issues[0]!.message }
  }
  const id = parseSnowflake(input.data.postId)
  if (id === null || !(await canViewerAccessPost(id))) {
    return { ok: false, error: 'Post not found.' }
  }

  const comment = await createComment({
    postId: id,
    authorId: viewer.id,
    body: input.data.body,
  })
  const counts = await getPostCounts(id)
  return {
    ok: true,
    comment: toCommentDTO(comment),
    commentCount: counts?.commentCount ?? 0,
  }
}
