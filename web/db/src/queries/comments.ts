import { prisma } from '../client'

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, username: true, image: true } },
} as const

export type CommentRow = Awaited<ReturnType<typeof createComment>>

/** A post's comments, oldest first. */
export async function listPostComments({
  postId,
  limit,
}: {
  postId: bigint
  limit: number
}) {
  return prisma.comment.findMany({
    where: { postId },
    orderBy: { id: 'asc' },
    take: limit,
    select: commentSelect,
  })
}

export async function createComment({
  postId,
  authorId,
  body,
}: {
  postId: bigint
  authorId: string
  body: string
}) {
  return prisma.comment.create({
    data: { postId, authorId, body },
    select: commentSelect,
  })
}
