import 'server-only'
import {
  findPostCircleId,
  getPostCounts,
  listCirclePosts,
  listPostComments,
  summarizePostReactions,
  type CommentRow,
  type PostRow,
  type ReactionSummary,
} from '@socialhub/db'
import { photoObjectKey } from '@/lib/photos'
import { signedGetUrl } from '@/lib/storage'
import { isViewerInCircle } from './circles'
import { getViewer } from './session'
import type {
  CommentDTO,
  PhotoDTO,
  PostDTO,
  PostPageDTO,
  ReactionStateDTO,
} from './dto'

export const FEED_PAGE_SIZE = 10
const COMMENTS_LIMIT = 200

/**
 * One page of a circle's feed, or null if the viewer isn't a member (or is
 * signed out). Not cached — the feed must be fresh on every request. Used by
 * the circle page (SSR, first page) and GET /api/circles/[circleId]/posts
 * (CSR, later pages), so both return identical shapes.
 */
export async function getCircleFeedPage(
  circleId: bigint,
  cursor: bigint | null = null,
): Promise<PostPageDTO | null> {
  const viewer = await getViewer()
  if (!viewer || !(await isViewerInCircle(circleId))) return null

  const page = await listCirclePosts({
    circleId,
    cursor,
    limit: FEED_PAGE_SIZE,
  })
  const reactions = await summarizePostReactions({
    postIds: page.posts.map((p) => p.id),
    viewerId: viewer.id,
  })
  return {
    posts: await Promise.all(
      page.posts.map((p) => toPostDTO(p, reactions.get(p.id)!)),
    ),
    nextCursor: page.nextCursor?.toString() ?? null,
  }
}

/**
 * Whether the viewer may see (and so react to or comment on) a post: true
 * only for members of the post's circle.
 */
export async function canViewerAccessPost(postId: bigint): Promise<boolean> {
  const circleId = await findPostCircleId(postId)
  return circleId !== null && (await isViewerInCircle(circleId))
}

export async function getPostComments(
  postId: bigint,
): Promise<CommentDTO[] | null> {
  if (!(await canViewerAccessPost(postId))) return null
  const comments = await listPostComments({ postId, limit: COMMENTS_LIMIT })
  return comments.map(toCommentDTO)
}

/** Fresh reaction state for one post, after the viewer reacted. */
export async function getReactionState(
  postId: bigint,
  viewerId: string,
): Promise<ReactionStateDTO> {
  const [counts, summaries] = await Promise.all([
    getPostCounts(postId),
    summarizePostReactions({ postIds: [postId], viewerId }),
  ])
  const summary = summaries.get(postId)!
  return {
    reactionCount: counts?.reactionCount ?? 0,
    topReactions: summary.topTypes,
    viewerReaction: summary.viewerType,
  }
}

export function toCommentDTO(comment: CommentRow): CommentDTO {
  return {
    id: comment.id.toString(),
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
  }
}

export async function toPhotoDTO(media: {
  id: bigint
  storageKey: string
  width: number
  height: number
}): Promise<PhotoDTO> {
  const [url, fullUrl] = await Promise.all([
    signedGetUrl(photoObjectKey(media.storageKey, 'feed')),
    signedGetUrl(photoObjectKey(media.storageKey, 'full')),
  ])
  return {
    id: media.id.toString(),
    url,
    fullUrl,
    width: media.width,
    height: media.height,
  }
}

async function toPostDTO(
  post: PostRow,
  reactions: ReactionSummary,
): Promise<PostDTO> {
  return {
    id: post.id.toString(),
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    photos: await Promise.all(post.media.map((m) => toPhotoDTO(m.media))),
    reactionCount: post.reactionCount,
    commentCount: post.commentCount,
    topReactions: reactions.topTypes,
    viewerReaction: reactions.viewerType,
  }
}
