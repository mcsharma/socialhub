import { prisma } from '../client'

// Pure data access — callers (web/main's DAL) check membership first.

const userSummarySelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const

/** Circles the user belongs to, oldest first. */
export async function listCirclesForUser(userId: string) {
  return prisma.circle.findMany({
    where: { members: { some: { userId } } },
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  })
}

export type CircleSummary = Awaited<
  ReturnType<typeof listCirclesForUser>
>[number]

export async function countCirclesForUser(userId: string) {
  return prisma.circleMember.count({ where: { userId } })
}

export async function getCircle(circleId: bigint) {
  return prisma.circle.findUnique({
    where: { id: circleId },
    select: { id: true, name: true, _count: { select: { members: true } } },
  })
}

/** Creates a circle with its creator as the first member. */
export async function createCircle({
  name,
  creatorId,
}: {
  name: string
  creatorId: string
}) {
  return prisma.circle.create({
    data: {
      name,
      createdById: creatorId,
      members: { create: { userId: creatorId } },
    },
    select: { id: true, name: true },
  })
}

/** Members in the order they joined. */
export async function listCircleMembers(circleId: bigint) {
  return prisma.circleMember.findMany({
    where: { circleId },
    orderBy: { joinedAt: 'asc' },
    select: {
      joinedAt: true,
      user: { select: userSummarySelect },
      addedBy: { select: userSummarySelect },
    },
  })
}

export async function isCircleMember({
  circleId,
  userId,
}: {
  circleId: bigint
  userId: string
}) {
  const row = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { userId: true },
  })
  return row !== null
}

export async function addCircleMember({
  circleId,
  userId,
  addedById,
}: {
  circleId: bigint
  userId: string
  addedById: string
}) {
  return prisma.circleMember.create({
    data: { circleId, userId, addedById },
    select: { userId: true },
  })
}
