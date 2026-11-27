'use client'

import { useState } from 'react'
import { MessageCircle, SmilePlus } from 'lucide-react'
import type { ReactionStateDTO } from '@/lib/dal/dto'
import { REACTIONS } from '@/lib/reactions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useReaction } from '@/components/feedback/useReaction'
import {
  ReactionPicker,
  ReactionSummary,
} from '@/components/feedback/ReactionPicker'

/**
 * A post's counts and actions. The main button toggles Like (or removes your
 * current reaction); the smiley button opens all five.
 */
export function ReactionBar({
  targetId,
  state,
  onChange,
  commentCount,
  commentsOpen,
  onToggleComments,
}: {
  targetId: string
  state: ReactionStateDTO
  onChange: (state: ReactionStateDTO) => void
  commentCount: number
  commentsOpen: boolean
  onToggleComments: () => void
}) {
  const { state: shown, react } = useReaction(targetId, state, onChange)
  const [pickerOpen, setPickerOpen] = useState(false)
  const current = shown.viewerReaction

  return (
    <div className="flex flex-col gap-2">
      {(shown.reactionCount > 0 || commentCount > 0) && (
        <div className="flex min-h-5 items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            {shown.reactionCount > 0 && <ReactionSummary {...shown} />}
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
          <ReactionPicker
            current={current}
            onPick={(type) => {
              setPickerOpen(false)
              react(type)
            }}
          />
        )}
      </div>
    </div>
  )
}
