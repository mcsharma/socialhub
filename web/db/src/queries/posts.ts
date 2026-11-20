import { prisma } from '../client'

// Pure data access: plain arguments in, rows out. No sessions, no
// permissions, no framework imports — those belong to the caller (e.g.
// web/main/src/lib/dal), which keeps these reusable from any TS process.

const authorSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const

export type PostPage = Awaited<ReturnType<typeof listFeedPosts>>
export type PostWithAuthor = PostPage['posts'][number]

/**
 * Newest-first keyset pagination. Snowflake IDs are time-ordered, so the
 * cursor is simply the last ID of the previous page.
 */
export async function listFeedPosts({
  cursor,
  limit,
}: {
  cursor?: bigint | null
  limit: number
}) {
  const rows = await prisma.post.findMany({
    where: cursor ? { id: { lt: cursor } } : undefined,
    orderBy: { id: 'desc' },
    take: limit + 1,
    include: { author: { select: authorSelect } },
  })
  const hasMore = rows.length > limit
  const posts = hasMore ? rows.slice(0, limit) : rows
  return { posts, nextCursor: hasMore ? posts[posts.length - 1]!.id : null }
}

export async function listPostsByAuthor({
  authorId,
  limit,
}: {
  authorId: string
  limit: number
}) {
  return prisma.post.findMany({
    where: { authorId },
    orderBy: { id: 'desc' },
    take: limit,
    include: { author: { select: authorSelect } },
  })
}

export async function countPostsByAuthor(authorId: string) {
  return prisma.post.count({ where: { authorId } })
}

export async function createPost({
  authorId,
  body,
}: {
  authorId: string
  body: string
}) {
  return prisma.post.create({
    data: { authorId, body },
    include: { author: { select: authorSelect } },
  })
}
