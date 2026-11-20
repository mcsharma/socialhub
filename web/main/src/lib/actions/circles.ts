'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { z } from 'zod'
import {
  addCircleMember,
  countCirclesForUser,
  createCircle,
  findUserByUsernameOrEmail,
  isCircleMember,
  parseSnowflake,
} from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { isViewerInCircle } from '@/lib/dal/circles'

// Server Actions are public HTTP endpoints — always re-authenticate and
// re-validate here, never trust the calling component.

export type FormState =
  { ok: true; message: string } | { ok: false; error: string } | null

const CircleName = z
  .string()
  .trim()
  .min(1, 'Give your circle a name.')
  .max(60, 'Keep the name under 60 characters.')

export async function createCircleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Sign in to create a circle.' }

  const name = CircleName.safeParse(formData.get('name'))
  if (!name.success) return { ok: false, error: name.error.issues[0]!.message }

  // Product rule: one circle per person for now.
  if ((await countCirclesForUser(viewer.id)) > 0) {
    return { ok: false, error: 'You’re already in a circle.' }
  }

  const circle = await createCircle({ name: name.data, creatorId: viewer.id })
  redirect(`/c/${circle.id}`)
}

const AddMemberInput = z.object({
  circleId: z.string(),
  identifier: z.string().trim().min(1, 'Enter a username or email.').max(320),
})

export async function addMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getViewer()
  if (!viewer) return { ok: false, error: 'Sign in to add people.' }

  const input = AddMemberInput.safeParse({
    circleId: formData.get('circleId'),
    identifier: formData.get('identifier'),
  })
  if (!input.success) {
    return { ok: false, error: input.error.issues[0]!.message }
  }
  const circleId = parseSnowflake(input.data.circleId)
  // Any member can add people; non-members get the same answer as for a
  // circle that doesn't exist.
  if (circleId === null || !(await isViewerInCircle(circleId))) {
    return { ok: false, error: 'Circle not found.' }
  }

  const user = await findUserByUsernameOrEmail(input.data.identifier)
  if (!user) {
    return {
      ok: false,
      error: 'No one with that username or email has an account yet.',
    }
  }
  if (await isCircleMember({ circleId, userId: user.id })) {
    return { ok: false, error: `${user.name} is already in this circle.` }
  }
  // Product rule: one circle per person for now.
  if ((await countCirclesForUser(user.id)) > 0) {
    return { ok: false, error: `${user.name} is already in another circle.` }
  }

  await addCircleMember({ circleId, userId: user.id, addedById: viewer.id })
  // Re-render the members page (and member count) for the person adding.
  refresh()
  return { ok: true, message: `Added ${user.name}.` }
}
