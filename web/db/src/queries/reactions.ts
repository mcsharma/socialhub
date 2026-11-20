import { prisma } from '../client'
import type { ReactionType } from '../__generated__/prisma/enums'

/** Sets (or changes) the user's reaction on a post. */
export async function setPostReaction({
  postId,
  userId,
  type,
}: {
  postId: bigint
  userId: string
  type: ReactionType
}) {
  await prisma.postReaction.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId, type },
    update: { type },
  })
}

export async function removePostReaction({
  postId,
  userId,
}: {
  postId: bigint
  userId: string
}) {
  await prisma.postReaction.deleteMany({ where: { postId, userId } })
}

export type ReactionSummary = {
  /** Up to 3 reaction types, most used first. */
  topTypes: ReactionType[]
  /** The viewer's own reaction, if any. */
  viewerType: ReactionType | null
}

/**
 * Per-post reaction breakdown for a page of posts: two queries regardless of
 * how many posts. Totals come from posts.reaction_count instead.
 */
export async function summarizePostReactions({
  postIds,
  viewerId,
}: {
  postIds: bigint[]
  viewerId: string
}): Promise<Map<bigint, ReactionSummary>> {
  const summaries = new Map<bigint, ReactionSummary>(
    postIds.map((id) => [id, { topTypes: [], viewerType: null }]),
  )
  if (postIds.length === 0) return summaries

  const [groups, mine] = await Promise.all([
    prisma.postReaction.groupBy({
      by: ['postId', 'type'],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    }),
    prisma.postReaction.findMany({
      where: { postId: { in: postIds }, userId: viewerId },
      select: { postId: true, type: true },
    }),
  ])

  const byPost = new Map<bigint, { type: ReactionType; count: number }[]>()
  for (const g of groups) {
    const list = byPost.get(g.postId) ?? []
    list.push({ type: g.type, count: g._count._all })
    byPost.set(g.postId, list)
  }
  for (const [postId, list] of byPost) {
    list.sort((a, b) => b.count - a.count)
    summaries.get(postId)!.topTypes = list.slice(0, 3).map((r) => r.type)
  }
  for (const r of mine) summaries.get(r.postId)!.viewerType = r.type
  return summaries
}
