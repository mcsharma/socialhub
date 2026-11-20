'use client'

import { useActionState } from 'react'
import { useSWRConfig } from 'swr'
import { unstable_serialize } from 'swr/infinite'
import { createPostAction, type CreatePostState } from '@/lib/actions/posts'
import type { UserSummaryDTO } from '@/lib/dal/dto'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/UserAvatar'
import { getFeedKey } from './feed-key'

/**
 * Mutation path: <form action> → Server Action (runs on the server, writes
 * via @socialhub/db) → on success, tell SWR to re-fetch the feed pages.
 */
export function Composer({ viewer }: { viewer: UserSummaryDTO }) {
  const { mutate } = useSWRConfig()
  const [state, formAction, isPending] = useActionState<
    CreatePostState,
    FormData
  >(async (prev, formData) => {
    const result = await createPostAction(prev, formData)
    if (result?.ok) await mutate(unstable_serialize(getFeedKey))
    return result
  }, null)

  return (
    <form
      action={formAction}
      className="rounded-lg border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex gap-3">
        <UserAvatar user={viewer} />
        <Textarea
          name="body"
          placeholder={`What's on your mind, ${viewer.name.split(' ')[0]}?`}
          aria-invalid={state?.ok === false || undefined}
          disabled={isPending}
          required
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        {state?.ok === false && (
          <p className="mr-auto text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  )
}
