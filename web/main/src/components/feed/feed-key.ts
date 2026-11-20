import type { PostPageDTO } from '@/lib/dal/dto'

/**
 * SWR Infinite key builder for the home feed: page 0 → /api/posts, page N →
 * /api/posts?cursor=<last id of page N-1>, stop when nextCursor is null.
 * Shared by FeedList (reads) and Composer (revalidates after posting) so
 * both address the same cache entry.
 */
export function getFeedKey(
  pageIndex: number,
  previousPage: PostPageDTO | null,
) {
  if (pageIndex === 0) return '/api/posts'
  if (!previousPage?.nextCursor) return null
  return `/api/posts?cursor=${previousPage.nextCursor}`
}
