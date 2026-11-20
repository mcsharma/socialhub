import { prisma } from '../client'

// Pure data access: plain arguments in, rows out. No sessions, no
// permissions, no framework imports — those belong to the caller (web/main's
// DAL), which must check circle membership before calling.

const postInclude = {
  author: { select: { id: true, name: true, username: true, image: true } },
  media: {
    orderBy: { position: 'asc' },
    select: {
      media: {
        select: { id: true, storageKey: true, width: true, height: true },
      },
    },
  },
} as const

export type PostPage = Awaited<ReturnType<typeof listCirclePosts>>
export type PostRow = PostPage['posts'][number]

/**
 * A circle's feed, newest first, with keyset pagination. Snowflake IDs are
 * time-ordered, so the cursor is simply the last ID of the previous page.
 */
export async function listCirclePosts({
  circleId,
  cursor,
  limit,
}: {
  circleId: bigint
  cursor?: bigint | null
  limit: number
}) {
  const rows = await prisma.post.findMany({
    where: { circleId, ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { id: 'desc' },
    take: limit + 1,
    include: postInclude,
  })
  const hasMore = rows.length > limit
  const posts = hasMore ? rows.slice(0, limit) : rows
  return { posts, nextCursor: hasMore ? posts[posts.length - 1]!.id : null }
}

/** The circle a post belongs to, for permission checks. */
export async function findPostCircleId(postId: bigint) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { circleId: true },
  })
  return post?.circleId ?? null
}

export async function getPostCounts(postId: bigint) {
  return prisma.post.findUnique({
    where: { id: postId },
    select: { reactionCount: true, commentCount: true },
  })
}

/**
 * Creates a post and attaches the given media, in order. Every media item
 * must have been uploaded by the author and not yet be attached to a post;
 * otherwise nothing is written and null is returned.
 */
export async function createPost({
  authorId,
  circleId,
  body,
  mediaIds,
}: {
  authorId: string
  circleId: bigint
  body: string | null
  mediaIds: bigint[]
}) {
  return prisma.$transaction(async (tx) => {
    if (mediaIds.length > 0) {
      const usable = await tx.media.count({
        where: { id: { in: mediaIds }, uploaderId: authorId, post: null },
      })
      if (usable !== new Set(mediaIds).size || usable !== mediaIds.length) {
        return null
      }
    }
    return tx.post.create({
      data: {
        authorId,
        circleId,
        body,
        media: {
          create: mediaIds.map((mediaId, position) => ({ mediaId, position })),
        },
      },
      select: { id: true },
    })
  })
}
