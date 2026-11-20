import 'server-only'
import { cache } from 'react'
import {
  getCircle,
  listCircleMembers,
  listCirclesForUser,
  type CircleSummary,
} from '@socialhub/db'
import { getViewer } from './session'
import type { CircleDTO, CircleMemberDTO } from './dto'

/**
 * Circles the signed-in viewer belongs to ([] when signed out). Circles are
 * secret, so this is the source of truth for every circle read and write:
 * the DAL only ever touches circles in this list.
 *
 * React cache(): one query per request however many components ask.
 */
export const getViewerCircles = cache(async (): Promise<CircleSummary[]> => {
  const viewer = await getViewer()
  if (!viewer) return []
  return listCirclesForUser(viewer.id)
})

/**
 * The viewer's circle. Product rule for now: a user is in at most one circle
 * (the schema allows many, so only code that calls this assumes one).
 */
export const getViewerCircle = cache(
  async (): Promise<CircleSummary | null> =>
    (await getViewerCircles())[0] ?? null,
)

export async function isViewerInCircle(circleId: bigint): Promise<boolean> {
  return (await getViewerCircles()).some((c) => c.id === circleId)
}

/** The circle, or null if it doesn't exist or the viewer isn't a member. */
export const getCircleForViewer = cache(
  async (circleId: bigint): Promise<CircleDTO | null> => {
    if (!(await isViewerInCircle(circleId))) return null
    const circle = await getCircle(circleId)
    if (!circle) return null
    return {
      id: circle.id.toString(),
      name: circle.name,
      memberCount: circle._count.members,
    }
  },
)

export async function getCircleMembers(
  circleId: bigint,
): Promise<CircleMemberDTO[] | null> {
  if (!(await isViewerInCircle(circleId))) return null
  const members = await listCircleMembers(circleId)
  return members.map((m) => ({
    user: m.user,
    addedBy: m.addedBy,
    joinedAt: m.joinedAt.toISOString(),
  }))
}
