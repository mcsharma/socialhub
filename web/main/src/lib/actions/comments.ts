'use server'

import { z } from 'zod'
import { createComment, getTargetCounts, parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import {
  canCommentOn,
  getAccessibleTarget,
  toCommentDTO,
} from '@/lib/dal/feedback'
import type { CommentDTO } from '@/lib/dal/dto'

export type AddCommentResult =
  | { ok: true; comment: CommentDTO; commentCount: number }
  | { ok: false; error: string }

const CommentInput = z.object({
  parentTargetId: z.string(),
  body: z
    .string()
    .trim()
    .min(1, 'Write something first.')
    .max(2000, 'Keep it under 2000 characters.'),
})

/**
 * Leaves a comment on any feedback target: a post (a comment) or a comment
 * (a reply). Returns the new comment and the target's new comment count.
 */
export async function addCommentAction(
  parentTargetId: string,
  body: string,
): Promise<AddCommentResult> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Sign in to comment.' }
  const input = CommentInput.safeParse({ parentTargetId, body })
  if (!input.success) {
    return { ok: false, error: input.error.issues[0]!.message }
  }
  const id = parseSnowflake(input.data.parentTargetId)
  const parent = id === null ? null : await getAccessibleTarget(id)
  if (!parent) return { ok: false, error: 'Not found.' }
  if (!(await canCommentOn(parent))) {
    return { ok: false, error: 'You can’t reply to a reply.' }
  }

  const comment = await createComment({
    parentTargetId: parent.id,
    circleId: parent.circleId,
    authorId: viewer.id,
    body: input.data.body,
  })
  const counts = await getTargetCounts(parent.id)
  return {
    ok: true,
    comment: toCommentDTO(
      comment,
      { topTypes: [], viewerType: null },
      parent.targetType === 'POST',
    ),
    commentCount: counts?.commentCount ?? 0,
  }
}
