// Public surface of @socialhub/db. Consumers import from '@socialhub/db'
// only — never from './__generated__' or individual files — so this package
// can reorganize internally without breaking them.

export { prisma } from './client'
export type {
  Circle,
  Comment,
  Media,
  Post,
  PostReaction,
  User,
} from './__generated__/prisma/client'
export { MediaKind, ReactionType } from './__generated__/prisma/enums'
export * from './ids'
export * from './queries/circles'
export * from './queries/comments'
export * from './queries/media'
export * from './queries/posts'
export * from './queries/reactions'
export * from './queries/users'
