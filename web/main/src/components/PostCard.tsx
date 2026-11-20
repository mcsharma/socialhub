import Link from 'next/link'
import type { PostDTO } from '@/lib/dal/dto'
import { UserAvatar } from '@/components/UserAvatar'

// No hooks, no server-only imports → renders as a Server Component (profile
// page) or inside a Client Component (feed list) alike.

const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function PostCard({ post }: { post: PostDTO }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <header className="mb-2 flex items-center gap-3">
        <UserAvatar user={post.author} />
        <div className="min-w-0">
          <Link
            href={`/u/${post.author.username}`}
            className="font-semibold text-foreground hover:underline"
          >
            {post.author.name}
          </Link>
          {/* Server and browser may format in different time zones —
              suppress the (expected) hydration text mismatch. */}
          <time
            dateTime={post.createdAt}
            suppressHydrationWarning
            className="block text-xs text-muted-foreground"
          >
            {dateFormat.format(new Date(post.createdAt))}
          </time>
        </div>
      </header>
      <p className="whitespace-pre-wrap break-words">{post.body}</p>
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
