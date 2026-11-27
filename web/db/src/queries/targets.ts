import { prisma } from '../client'
import type { Comment, Post } from '../__generated__/prisma/client'

/**
 * What a feedback target belongs to. Prisma has no polymorphic relations,
 * so the schema has one `owner…` relation per type; callers get this union
 * instead and narrow with `switch (owner.type)`. Adding a target type = one
 * case here and in findFeedbackTarget.
 */
export type FeedbackTargetOwner =
  { type: 'POST'; post: Post } | { type: 'COMMENT'; comment: Comment }

/** A feedback target with its counts and a typed owner, or null. */
export async function findFeedbackTarget(id: bigint) {
  const row = await prisma.feedbackTarget.findUnique({
    where: { id },
    include: { ownerPost: true, ownerComment: true },
  })
  if (!row) return null
  const { ownerPost, ownerComment, ...target } = row
  let owner: FeedbackTargetOwner
  switch (row.targetType) {
    case 'POST':
      owner = { type: 'POST', post: ownerPost! }
      break
    case 'COMMENT':
      owner = { type: 'COMMENT', comment: ownerComment! }
      break
  }
  return { ...target, owner }
}

export type FeedbackTargetWithOwner = NonNullable<
  Awaited<ReturnType<typeof findFeedbackTarget>>
>

export async function getTargetCounts(id: bigint) {
  return prisma.feedbackTarget.findUnique({
    where: { id },
    select: { reactionCount: true, commentCount: true },
  })
}

/** Just a target's type, e.g. to check how deep a reply would be. */
export async function findTargetType(id: bigint) {
  const row = await prisma.feedbackTarget.findUnique({
    where: { id },
    select: { targetType: true },
  })
  return row?.targetType ?? null
}
