import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { countPostsByAuthor, findUserByUsername } from '@socialhub/db'
import type { UserSummaryDTO } from './dto'

export type ProfileDTO = UserSummaryDTO & { joinedAt: string; postCount: number }

export const profileTag = (username: string) => `profile:${username}`

/**
 * Profile header data — CACHED ('use cache'), unlike the feed.
 *
 * The result is cached per `username` (arguments are part of the cache key)
 * and tagged, so a mutation can invalidate exactly one profile:
 * the createPost Server Action calls updateTag(profileTag(username)) to
 * refresh the post count. Otherwise it's served from cache for up to
 * 'hours'.
 */
export async function getProfile(username: string): Promise<ProfileDTO | null> {
  'use cache'
  cacheTag(profileTag(username))
  cacheLife('hours')

  const user = await findUserByUsername(username)
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    joinedAt: user.createdAt.toISOString(),
    postCount: await countPostsByAuthor(user.id),
  }
}
