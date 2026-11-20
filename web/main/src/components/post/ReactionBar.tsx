'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { MessageCircle, SmilePlus } from 'lucide-react'
import { setReactionAction } from '@/lib/actions/reactions'
import type { ReactionStateDTO } from '@/lib/dal/dto'
import { REACTIONS, REACTION_TYPES, type ReactionType } from '@/lib/reactions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
 * A post's counts and actions. The main button toggles Like (or removes your
 * current reaction); the smiley button opens the full set. Reaction changes
 * appear instantly (useOptimistic) and are replaced by the server's answer.
 */
export function ReactionBar({
  postId,
  state,
  onChange,
  commentCount,
  commentsOpen,
  onToggleComments,
}: {
  postId: string
  state: ReactionStateDTO
  onChange: (state: ReactionStateDTO) => void
  commentCount: number
  commentsOpen: boolean
  onToggleComments: () => void
}) {
  const [optimistic, setOptimistic] = useOptimistic(state)
  const [, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)

  function react(type: ReactionType | null) {
    setPickerOpen(false)
    startTransition(async () => {
      setOptimistic(applyReaction(state, type))
      const next = await setReactionAction(postId, type)
      if (next) onChange(next)
    })
  }

  const current = optimistic.viewerReaction
  return (
    <div className="flex flex-col gap-2">
      {(optimistic.reactionCount > 0 || commentCount > 0) && (
        <div className="flex min-h-5 items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            {optimistic.reactionCount > 0 && (
              <>
                <span aria-hidden className="tracking-tighter">
                  {optimistic.topReactions
                    .map((t) => REACTIONS[t].emoji)
                    .join('')}
                </span>
                <span aria-label={`${optimistic.reactionCount} reactions`}>
                  {optimistic.reactionCount}
                </span>
              </>
            )}
          </span>
          {commentCount > 0 && (
            <button
              type="button"
              className="hover:underline"
              aria-expanded={commentsOpen}
              onClick={onToggleComments}
            >
              {commentCount === 1 ? '1 comment' : `${commentCount} comments`}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={current !== null}
          className={cn(current && 'font-semibold text-primary')}
          onClick={() => react(current ? null : 'LIKE')}
        >
          <span aria-hidden>{REACTIONS[current ?? 'LIKE'].emoji}</span>
          {REACTIONS[current ?? 'LIKE'].label}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Choose a reaction"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
        >
          <SmilePlus />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={commentsOpen}
          onClick={onToggleComments}
        >
          <MessageCircle />
          Comment
        </Button>
        {pickerOpen && (
          <div
            role="group"
            aria-label="Reactions"
            className="flex items-center gap-0.5 rounded-full border border-border bg-popover px-1 shadow-xs"
          >
            {REACTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                title={REACTIONS[type].label}
                aria-label={REACTIONS[type].label}
                aria-pressed={current === type}
                onClick={() => react(current === type ? null : type)}
                className={cn(
                  'rounded-full p-1 text-xl leading-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  current === type && 'bg-accent',
                )}
              >
                {REACTIONS[type].emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
