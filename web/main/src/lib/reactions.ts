// Reaction types as plain constants, safe to import from Client Components
// (importing the Prisma enum from @socialhub/db would pull the database
// client into the browser bundle). Must match `enum ReactionType` in
// web/db/prisma/schema.prisma — the server validates against this list.

export const REACTION_TYPES = ['LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY'] as const
export type ReactionType = (typeof REACTION_TYPES)[number]

export const REACTIONS: Record<ReactionType, { emoji: string; label: string }> =
  {
    LIKE: { emoji: '👍', label: 'Like' },
    LOVE: { emoji: '❤️', label: 'Love' },
    HAHA: { emoji: '😆', label: 'Haha' },
    SAD: { emoji: '😢', label: 'Sad' },
    ANGRY: { emoji: '😡', label: 'Angry' },
  }
