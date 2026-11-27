'use client'

import { useState, useTransition } from 'react'
import useSWR from 'swr'
import { SmilePlus } from 'lucide-react'
import { addCommentAction } from '@/lib/actions/comments'
import type { CommentDTO } from '@/lib/dal/dto'
import { formatDateTime } from '@/lib/format'
import { REACTIONS } from '@/lib/reactions'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useReaction } from './useReaction'
import { ReactionPicker, ReactionSummary } from './ReactionPicker'

/**
 * Comments left on any feedback target, loaded when shown, plus a form to
 * add one. Used for a post's comments and, nested, for a comment's replies.
 */
export function Comments({
  targetId,
  onCountChange,
  kind = 'comment',
  autoFocus = false,
}: {
  targetId: string
  /** Called with the target's new comment count after adding one. */
  onCountChange: (count: number) => void
  kind?: 'comment' | 'reply'
  autoFocus?: boolean
}) {
  const { data, error, isLoading, mutate } = useSWR<CommentDTO[]>(
    `/api/feedback/${targetId}/comments`,
  )

  // Patch one comment in the cached list (its reactions or reply count).
  const updateComment = (id: string, patch: Partial<CommentDTO>) =>
    mutate((list) => list?.map((c) => (c.id === id ? { ...c, ...patch } : c)), {
      revalidate: false,
    })

  return (
    <div className="flex flex-col gap-3">
      {isLoading && (
        <p className="text-sm text-muted-foreground">
          Loading {kind === 'reply' ? 'replies' : 'comments'}…
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          Couldn’t load {kind === 'reply' ? 'replies' : 'comments'}.
        </p>
      )}
      {data?.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onUpdate={updateComment}
        />
      ))}
      <CommentForm
        targetId={targetId}
        kind={kind}
        autoFocus={autoFocus}
        onAdded={async (comment, count) => {
          await mutate((list) => [...(list ?? []), comment], {
            revalidate: false,
          })
          onCountChange(count)
        }}
      />
    </div>
  )
}

function CommentItem({
  comment,
  onUpdate,
}: {
  comment: CommentDTO
  onUpdate: (id: string, patch: Partial<CommentDTO>) => void
}) {
  const { state, react } = useReaction(
    comment.targetId,
    {
      reactionCount: comment.reactionCount,
      topReactions: comment.topReactions,
      viewerReaction: comment.viewerReaction,
    },
    (next) => onUpdate(comment.id, next),
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [repliesOpen, setRepliesOpen] = useState(false)
  const current = state.viewerReaction

  return (
    <div className="flex gap-2" data-comment-id={comment.id}>
      <UserAvatar user={comment.author} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="w-fit max-w-full rounded-lg bg-muted px-3 py-2">
          <span className="text-sm font-semibold">{comment.author.name}</span>
          <p className="text-sm break-words whitespace-pre-wrap">
            {comment.body}
          </p>
        </div>

        <div className="mt-1 flex items-center gap-3 px-3 text-xs text-muted-foreground">
          <time dateTime={comment.createdAt} suppressHydrationWarning>
            {formatDateTime(comment.createdAt)}
          </time>
          <button
            type="button"
            aria-pressed={current !== null}
            onClick={() => react(current ? null : 'LIKE')}
            className={cn(
              'font-semibold hover:underline',
              current && 'text-primary',
            )}
          >
            {REACTIONS[current ?? 'LIKE'].label}
          </button>
          <button
            type="button"
            aria-label="Choose a reaction"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
            className="hover:text-foreground"
          >
            <SmilePlus className="size-3.5" />
          </button>
          {comment.canReply && (
            <button
              type="button"
              onClick={() => setRepliesOpen(true)}
              className="font-semibold hover:underline"
            >
              Reply
            </button>
          )}
          {state.reactionCount > 0 && (
            <span className="flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 shadow-xs">
              <ReactionSummary {...state} />
            </span>
          )}
        </div>
        {pickerOpen && (
          <ReactionPicker
            className="mt-1"
            current={current}
            onPick={(type) => {
              setPickerOpen(false)
              react(type)
            }}
          />
        )}

        {comment.replyCount > 0 && !repliesOpen && (
          <button
            type="button"
            onClick={() => setRepliesOpen(true)}
            className="mt-1 px-3 text-xs font-semibold text-muted-foreground hover:underline"
          >
            {comment.replyCount === 1
              ? 'View 1 reply'
              : `View ${comment.replyCount} replies`}
          </button>
        )}
        {repliesOpen && (
          <div className="mt-3">
            <Comments
              targetId={comment.targetId}
              kind="reply"
              autoFocus
              onCountChange={(count) =>
                onUpdate(comment.id, { replyCount: count })
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

function CommentForm({
  targetId,
  kind,
  autoFocus,
  onAdded,
}: {
  targetId: string
  kind: 'comment' | 'reply'
  autoFocus: boolean
  onAdded: (comment: CommentDTO, count: number) => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const label = kind === 'reply' ? 'Write a reply…' : 'Write a comment…'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await addCommentAction(targetId, body)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      setBody('')
      await onAdded(result.comment, result.commentCount)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={label}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          maxLength={2000}
          disabled={isPending}
          autoFocus={autoFocus}
        />
        <Button type="submit" size="md" disabled={isPending || !body.trim()}>
          {isPending ? 'Posting…' : kind === 'reply' ? 'Reply' : 'Comment'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
