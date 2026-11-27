import type { ReactionType } from '@/lib/reactions'

// DTOs — the only shapes that leave the server (to Client Components, JSON
// API responses, SWR caches). Database rows never cross that boundary
// directly: BigInt IDs become decimal strings, Dates become ISO strings,
// storage keys become signed URLs, and only the fields the UI needs are
// exposed.

export type UserSummaryDTO = {
  id: string
  name: string
  username: string
  image: string | null
}

export type CircleDTO = {
  id: string
  name: string
  memberCount: number
}

export type CircleMemberDTO = {
  user: UserSummaryDTO
  addedBy: UserSummaryDTO | null
  joinedAt: string
}

export type PhotoDTO = {
  id: string
  /** Signed URL of the feed-sized image (≤1080px). */
  url: string
  /** Signed URL of the full-sized image (≤2048px). */
  fullUrl: string
  width: number
  height: number
}

/** Everything a post's reaction bar shows. */
export type ReactionStateDTO = {
  reactionCount: number
  /** Up to 3 reaction types, most used first. */
  topReactions: ReactionType[]
  viewerReaction: ReactionType | null
}

export type PostDTO = ReactionStateDTO & {
  id: string
  /** The post's feedback target: what its reactions and comments attach to. */
  targetId: string
  body: string | null
  createdAt: string
  author: UserSummaryDTO
  photos: PhotoDTO[]
  /** Comments directly on the post (replies not included). */
  commentCount: number
}

export type PostPageDTO = {
  posts: PostDTO[]
  nextCursor: string | null
}

export type CommentDTO = ReactionStateDTO & {
  id: string
  /** The comment's own feedback target: its reactions and replies. */
  targetId: string
  body: string
  createdAt: string
  author: UserSummaryDTO
  replyCount: number
  /** Whether it can be replied to (only comments on posts: two levels). */
  canReply: boolean
}
