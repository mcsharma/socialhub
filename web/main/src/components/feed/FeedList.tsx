'use client'

import useSWRInfinite from 'swr/infinite'
import type { PostDTO, PostPageDTO } from '@/lib/dal/dto'
import { PostCard } from '@/components/post/PostCard'
import { Button } from '@/components/ui/button'
import { getFeedKey } from './feed-key'

/**
 * A circle's feed.
 *  - The first page arrives as `initialPage`, rendered on the server into
 *    the HTML; SWR adopts it as `fallbackData` and doesn't refetch it on
 *    mount.
 *  - "Load more" fetches later pages in the browser.
 *  - Reactions and comments patch the affected post in SWR's cache
 *    (`updatePost`) instead of refetching every loaded page.
 *  - The Composer revalidates the whole feed after a new post.
 */
export function FeedList({
  circleId,
  initialPage,
}: {
  circleId: string
  initialPage: PostPageDTO
}) {
  const { data, error, size, setSize, isValidating, mutate } =
    useSWRInfinite<PostPageDTO>(getFeedKey(circleId), {
      fallbackData: [initialPage],
      revalidateOnMount: false,
      revalidateFirstPage: false,
    })

  const pages = data ?? [initialPage]
  const posts = pages.flatMap((page) => page.posts)
  const hasMore = Boolean(pages[pages.length - 1]?.nextCursor)
  const isLoadingMore = isValidating && size > pages.length

  // Patch one post in place. Until SWR's first fetch its cache is empty (the
  // server-rendered page is only `fallbackData`), so start from that page.
  // Patching the cache (not the pages from this render) keeps two quick
  // updates to different posts from overwriting each other.
  const updatePost = (postId: string, patch: Partial<PostDTO>) =>
    mutate(
      (cached) =>
        (cached ?? [initialPage]).map((page) => ({
          ...page,
          posts: page.posts.map((p) =>
            p.id === postId ? { ...p, ...patch } : p,
          ),
        })),
      { revalidate: false },
    )

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onUpdate={updatePost} />
      ))}
      {posts.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          No posts yet. Share the first one.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          Couldn’t load posts. {String(error.message)}
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
