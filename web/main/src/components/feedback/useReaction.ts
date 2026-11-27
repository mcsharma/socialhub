'use client'

import { useOptimistic, useTransition } from 'react'
import { setReactionAction } from '@/lib/actions/reactions'
import type { ReactionStateDTO } from '@/lib/dal/dto'
import type { ReactionType } from '@/lib/reactions'

/** Best guess at the new state, shown until the server answers. */
function applyReaction(
  state: ReactionStateDTO,
  type: ReactionType | null,
): ReactionStateDTO {
  const had = state.viewerReaction !== null
  const reactionCount =
    state.reactionCount + (type && !had ? 1 : 0) - (!type && had ? 1 : 0)
  const topReactions =
    type && !state.topReactions.includes(type)
      ? [...state.topReactions, type].slice(0, 3)
      : state.topReactions
  return { reactionCount, topReactions, viewerReaction: type }
}

/**
 * Reacting to any feedback target (post, comment, …). `react(type)` sets the
 * viewer's reaction, `react(null)` removes it. The change shows instantly and
 * is replaced by the server's answer, which is passed to `onChange` so the
 * caller can update its cache.
 */
export function useReaction(
  targetId: string,
  state: ReactionStateDTO,
  onChange: (state: ReactionStateDTO) => void,
) {
  const [optimistic, setOptimistic] = useOptimistic(state)
  const [, startTransition] = useTransition()

  function react(type: ReactionType | null) {
    startTransition(async () => {
      setOptimistic(applyReaction(state, type))
      const next = await setReactionAction(targetId, type)
      if (next) onChange(next)
    })
  }
  return { state: optimistic, react }
}
