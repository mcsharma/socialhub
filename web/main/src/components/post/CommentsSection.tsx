'use client'

import { useState, useTransition } from 'react'
import useSWR from 'swr'
import { addCommentAction } from '@/lib/actions/comments'
import type { CommentDTO } from '@/lib/dal/dto'
import { formatDateTime } from '@/lib/format'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * A post's comments, loaded in the browser when opened (most feed visitors
 * never open them, so they aren't part of the feed payload), plus a form to
 * add one.
 */
export function CommentsSection({
  postId,
  onCountChange,
}: {
  postId: string
  onCountChange: (count: number) => void
}) {
  const { data, error, isLoading, mutate } = useSWR<CommentDTO[]>(
    `/api/posts/${postId}/comments`,
  )
  const [body, setBody] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await addCommentAction(postId, body)
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      setFormError(null)
      setBody('')
      await mutate((list) => [...(list ?? []), result.comment], {
        revalidate: false,
      })
      onCountChange(result.commentCount)
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">Couldn’t load comments.</p>
      )}
      {data?.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <UserAvatar user={comment.author} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="rounded-lg bg-muted px-3 py-2">
              <span className="text-sm font-semibold">
                {comment.author.name}
              </span>
              <p className="text-sm break-words whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
            <time
              dateTime={comment.createdAt}
              suppressHydrationWarning
              className="mt-0.5 block px-3 text-xs text-muted-foreground"
            >
              {formatDateTime(comment.createdAt)}
            </time>
          </div>
        </div>
      ))}

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment…"
          aria-label="Write a comment"
          aria-invalid={formError ? true : undefined}
          maxLength={2000}
          disabled={isPending}
        />
        <Button type="submit" size="md" disabled={isPending || !body.trim()}>
          {isPending ? 'Posting…' : 'Comment'}
        </Button>
      </form>
      {formError && <p className="text-sm text-destructive">{formError}</p>}
    </div>
  )
}
