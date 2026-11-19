import type { PostWithAuthor } from '@socialhub/db'

// DTOs — the only shapes that leave the server (to Client Components, JSON
// API responses, SWR caches). Database rows never cross that boundary
// directly: BigInt IDs become decimal strings, Dates become ISO strings, and
// only the fields the UI needs are exposed.

export type UserSummaryDTO = {
  id: string
  name: string
  username: string
  image: string | null
}

export type PostDTO = {
  id: string
  body: string
  createdAt: string
  author: UserSummaryDTO
}

export type PostPageDTO = {
  posts: PostDTO[]
  nextCursor: string | null
}

export function toPostDTO(post: PostWithAuthor): PostDTO {
  return {
    id: post.id.toString(),
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
  }
}
