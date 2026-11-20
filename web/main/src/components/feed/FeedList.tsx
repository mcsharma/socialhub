'use client'

import useSWRInfinite from 'swr/infinite'
import type { PostPageDTO } from '@/lib/dal/dto'
import { PostCard } from '@/components/PostCard'
import { Button } from '@/components/ui/button'
import { getFeedKey } from './feed-key'

/**
 * SSR + CSR hand-off:
 *  - The first page arrives as `initialPage`, fetched on the server and
 *    rendered into the HTML (fast first paint, no loading spinner).
 *  - SWR adopts it as the cache's initial value (`fallbackData`), so it does
 *    NOT refetch it on mount.
 *  - "Load more" pages are fetched in the browser from GET /api/posts.
 *  - SWR revalidates on window focus / reconnect and when Composer calls
 *    mutate() after a new post.
 */
export function FeedList({ initialPage }: { initialPage: PostPageDTO }) {
  const { data, error, size, setSize, isValidating } =
    useSWRInfinite<PostPageDTO>(getFeedKey, {
      fallbackData: [initialPage],
      revalidateOnMount: false,
      revalidateFirstPage: false,
    })

  const pages = data ?? [initialPage]
  const posts = pages.flatMap((page) => page.posts)
  const hasMore = Boolean(pages[pages.length - 1]?.nextCursor)
  const isLoadingMore = isValidating && size > pages.length

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {posts.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">No posts yet.</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          Couldn&apos;t load posts. {String(error.message)}
        </p>
      )}
      {hasMore && (
        <Button
          variant="outline"
          size="md"
          className="self-center"
          disabled={isLoadingMore}
          onClick={() => setSize(size + 1)}
        >
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
