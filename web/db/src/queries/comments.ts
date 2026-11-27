import { prisma } from '../client'

// Comments on any feedback target. A comment owns a target of its own, so
// replies are just comments left on a comment's target.

const commentSelect = {
  id: true,
  targetId: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, username: true, image: true } },
  target: { select: { reactionCount: true, commentCount: true } },
} as const

export type CommentRow = Awaited<ReturnType<typeof createComment>>

/** Comments left on a target, oldest first. */
export async function listComments({
  parentTargetId,
  limit,
}: {
  parentTargetId: bigint
  limit: number
}) {
  return prisma.comment.findMany({
    where: { parentTargetId },
    orderBy: { id: 'asc' },
    take: limit,
    select: commentSelect,
  })
}

/**
 * Leaves a comment on a target, creating the comment's own target in the
 * same circle.
 */
export async function createComment({
  parentTargetId,
  circleId,
  authorId,
  body,
}: {
  parentTargetId: bigint
  circleId: bigint
  authorId: string
  body: string
}) {
  return prisma.comment.create({
    // Relations via connect/create: Prisma doesn't allow raw foreign-key IDs
    // alongside a nested create.
    data: {
      parentTarget: { connect: { id: parentTargetId } },
      author: { connect: { id: authorId } },
      body,
      target: { create: { targetType: 'COMMENT', circleId } },
    },
    select: commentSelect,
  })
}
