import 'server-only'
import { listFeedPosts, listPostsByAuthor } from '@socialhub/db'
import { toPostDTO, type PostDTO, type PostPageDTO } from './dto'

export const FEED_PAGE_SIZE = 10

/**
 * One page of the home feed. Deliberately NOT cached — the feed must be
 * fresh on every request. Used both by the home page (SSR, first page) and
 * by GET /api/posts (CSR, subsequent pages), so both return identical shapes.
 */
export async function getFeedPage(cursor: bigint | null = null): Promise<PostPageDTO> {
  const page = await listFeedPosts({ cursor, limit: FEED_PAGE_SIZE })
  return {
    posts: page.posts.map(toPostDTO),
    nextCursor: page.nextCursor?.toString() ?? null,
  }
}

export async function getRecentPostsByAuthor(authorId: string): Promise<PostDTO[]> {
  const posts = await listPostsByAuthor({ authorId, limit: 20 })
  return posts.map(toPostDTO)
}
