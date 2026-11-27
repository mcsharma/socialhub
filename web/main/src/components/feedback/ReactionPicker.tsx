'use client'

import { REACTIONS, REACTION_TYPES, type ReactionType } from '@/lib/reactions'
import { cn } from '@/lib/utils'

/** The five reactions in a row. Picking your current one removes it. */
export function ReactionPicker({
  current,
  onPick,
  className,
}: {
  current: ReactionType | null
  onPick: (type: ReactionType | null) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Reactions"
      className={cn(
        'flex w-fit items-center gap-0.5 rounded-full border border-border bg-popover px-1 shadow-xs',
        className,
      )}
    >
      {REACTION_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          title={REACTIONS[type].label}
          aria-label={REACTIONS[type].label}
          aria-pressed={current === type}
          onClick={() => onPick(current === type ? null : type)}
          className={cn(
            'rounded-full p-1 text-xl leading-none transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            current === type && 'bg-accent',
          )}
        >
          {REACTIONS[type].emoji}
        </button>
      ))}
    </div>
  )
}

/** "❤️😆 3" — the top reactions and the total. */
export function ReactionSummary({
  topReactions,
  reactionCount,
}: {
  topReactions: ReactionType[]
  reactionCount: number
}) {
  return (
    <>
      <span aria-hidden className="tracking-tighter">
        {topReactions.map((t) => REACTIONS[t].emoji).join('')}
      </span>
      <span aria-label={`${reactionCount} reactions`}>{reactionCount}</span>
    </>
  )
}
