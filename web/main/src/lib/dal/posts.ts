import 'server-only'
import {
  listCirclePosts,
  summarizeReactions,
  type PostRow,
  type ReactionSummary,
} from '@socialhub/db'
import { photoObjectKey } from '@/lib/photos'
import { signedGetUrl } from '@/lib/storage'
import { isViewerInCircle } from './circles'
import { getViewer } from './session'
import type { PhotoDTO, PostDTO, PostPageDTO } from './dto'

export const FEED_PAGE_SIZE = 10

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
  const reactions = await summarizeReactions({
    targetIds: page.posts.map((p) => p.targetId),
    viewerId: viewer.id,
  })
  return {
    posts: await Promise.all(
      page.posts.map((p) => toPostDTO(p, reactions.get(p.targetId)!)),
    ),
    nextCursor: page.nextCursor?.toString() ?? null,
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
    targetId: post.targetId.toString(),
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
    photos: await Promise.all(post.media.map((m) => toPhotoDTO(m.media))),
    reactionCount: post.target.reactionCount,
    commentCount: post.target.commentCount,
    topReactions: reactions.topTypes,
    viewerReaction: reactions.viewerType,
  }
}
