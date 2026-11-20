import type { PostPageDTO } from '@/lib/dal/dto'

/**
 * SWR Infinite key builder for a circle's feed: page 0 →
 * /api/circles/<id>/posts, page N → …?cursor=<last id of page N-1>, stop
 * when nextCursor is null. Shared by FeedList (reads) and Composer
 * (revalidates after posting) so both address the same cache entry.
 *
 * The circle ID is part of the key, so the browser's SWR cache can never
 * show one circle's posts in another's feed (e.g. after switching accounts).
 */
export function getFeedKey(circleId: string) {
  const base = `/api/circles/${circleId}/posts`
  return (pageIndex: number, previousPage: PostPageDTO | null) => {
    if (pageIndex === 0) return base
    if (!previousPage?.nextCursor) return null
    return `${base}?cursor=${previousPage.nextCursor}`
  }
}
