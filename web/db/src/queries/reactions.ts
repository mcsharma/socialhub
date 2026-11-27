import { prisma } from '../client'
import type { ReactionType } from '../__generated__/prisma/enums'

// Reactions on any feedback target (posts, comments, …).

/** Sets (or changes) the user's reaction on a target. */
export async function setReaction({
  targetId,
  userId,
  type,
}: {
  targetId: bigint
  userId: string
  type: ReactionType
}) {
  await prisma.reaction.upsert({
    where: { targetId_userId: { targetId, userId } },
    create: { targetId, userId, type },
    update: { type },
  })
}

export async function removeReaction({
  targetId,
  userId,
}: {
  targetId: bigint
  userId: string
}) {
  await prisma.reaction.deleteMany({ where: { targetId, userId } })
}

export type ReactionSummary = {
  /** Up to 3 reaction types, most used first. */
  topTypes: ReactionType[]
  /** The viewer's own reaction, if any. */
  viewerType: ReactionType | null
}

/**
 * Per-target reaction breakdown for a batch of targets (a feed page, a list
 * of comments): two queries regardless of how many. Totals come from
 * feedback_targets.reaction_count instead.
 */
export async function summarizeReactions({
  targetIds,
  viewerId,
}: {
  targetIds: bigint[]
  viewerId: string
}): Promise<Map<bigint, ReactionSummary>> {
  const summaries = new Map<bigint, ReactionSummary>(
    targetIds.map((id) => [id, { topTypes: [], viewerType: null }]),
  )
  if (targetIds.length === 0) return summaries

  const [groups, mine] = await Promise.all([
    prisma.reaction.groupBy({
      by: ['targetId', 'type'],
      where: { targetId: { in: targetIds } },
      _count: { _all: true },
    }),
    prisma.reaction.findMany({
      where: { targetId: { in: targetIds }, userId: viewerId },
      select: { targetId: true, type: true },
    }),
  ])

  const byTarget = new Map<bigint, { type: ReactionType; count: number }[]>()
  for (const g of groups) {
    const list = byTarget.get(g.targetId) ?? []
    list.push({ type: g.type, count: g._count._all })
    byTarget.set(g.targetId, list)
  }
  for (const [targetId, list] of byTarget) {
    list.sort((a, b) => b.count - a.count)
    summaries.get(targetId)!.topTypes = list.slice(0, 3).map((r) => r.type)
  }
  for (const r of mine) summaries.get(r.targetId)!.viewerType = r.type
  return summaries
}
