'use server'

import { z } from 'zod'
import { parseSnowflake, removeReaction, setReaction } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { getAccessibleTarget, getReactionState } from '@/lib/dal/feedback'
import type { ReactionStateDTO } from '@/lib/dal/dto'
import { REACTION_TYPES, type ReactionType } from '@/lib/reactions'

const ReactionInput = z.object({
  targetId: z.string(),
  type: z.enum(REACTION_TYPES).nullable(),
})

/**
 * Sets the viewer's reaction on any feedback target (a post, a comment, …),
 * or removes it with `null`. Returns the target's fresh reaction state, or
 * null if not allowed.
 */
export async function setReactionAction(
  targetId: string,
  type: ReactionType | null,
): Promise<ReactionStateDTO | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  const input = ReactionInput.safeParse({ targetId, type })
  if (!input.success) return null
  const id = parseSnowflake(input.data.targetId)
  if (id === null || !(await getAccessibleTarget(id))) return null

  if (input.data.type) {
    await setReaction({
      targetId: id,
      userId: viewer.id,
      type: input.data.type,
    })
  } else {
    await removeReaction({ targetId: id, userId: viewer.id })
  }
  return getReactionState(id, viewer.id)
}
