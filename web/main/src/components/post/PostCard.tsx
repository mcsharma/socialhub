'use client'

import { useState } from 'react'
import type { PostDTO } from '@/lib/dal/dto'
import { formatDateTime } from '@/lib/format'
import { UserAvatar } from '@/components/UserAvatar'
import { PostPhotos } from './PostPhotos'
import { ReactionBar } from './ReactionBar'
import { Comments } from '@/components/feedback/Comments'

export function PostCard({
  post,
  onUpdate,
}: {
  post: PostDTO
  /** Patches this post in the feed's cache (reactions, comment count). */
  onUpdate: (postId: string, patch: Partial<PostDTO>) => void
}) {
  const [commentsOpen, setCommentsOpen] = useState(false)

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
      <header className="flex items-center gap-3">
        <UserAvatar user={post.author} />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{post.author.name}</p>
          <time
            dateTime={post.createdAt}
            suppressHydrationWarning
            className="block text-xs text-muted-foreground"
          >
            {formatDateTime(post.createdAt)}
          </time>
        </div>
      </header>

      {post.body && (
        <p className="break-words whitespace-pre-wrap">{post.body}</p>
      )}
      <PostPhotos photos={post.photos} />

      <ReactionBar
        targetId={post.targetId}
        state={post}
        onChange={(state) => onUpdate(post.id, state)}
        commentCount={post.commentCount}
        commentsOpen={commentsOpen}
        onToggleComments={() => setCommentsOpen((open) => !open)}
      />
      {commentsOpen && (
        <div className="border-t border-border pt-3">
          <Comments
            targetId={post.targetId}
            onCountChange={(count) =>
              onUpdate(post.id, { commentCount: count })
            }
          />
        </div>
      )}
    </article>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="size-10 rounded-full bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
      <div className="h-4 w-3/4 rounded bg-muted" />
    </div>
  )
}
