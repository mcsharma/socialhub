'use server'

import { z } from 'zod'
import {
  parseSnowflake,
  removePostReaction,
  setPostReaction,
} from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { canViewerAccessPost, getReactionState } from '@/lib/dal/posts'
import type { ReactionStateDTO } from '@/lib/dal/dto'
import { REACTION_TYPES } from '@/lib/reactions'

const ReactionInput = z.object({
  postId: z.string(),
  type: z.enum(REACTION_TYPES).nullable(),
})

/**
 * Sets the viewer's reaction on a post (`type`), or removes it (`null`).
 * Returns the post's fresh reaction state, or null if not allowed.
 */
export async function setReactionAction(
  postId: string,
  type: (typeof REACTION_TYPES)[number] | null,
): Promise<ReactionStateDTO | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  const input = ReactionInput.safeParse({ postId, type })
  if (!input.success) return null
  const id = parseSnowflake(input.data.postId)
  if (id === null || !(await canViewerAccessPost(id))) return null

  if (input.data.type) {
    await setPostReaction({
      postId: id,
      userId: viewer.id,
      type: input.data.type,
    })
  } else {
    await removePostReaction({ postId: id, userId: viewer.id })
  }
  return getReactionState(id, viewer.id)
}
