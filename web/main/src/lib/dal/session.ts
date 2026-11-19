import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import type { UserSummaryDTO } from './dto'

/**
 * The signed-in user for this request, or null.
 *
 * Wrapped in React `cache()` so the nav bar, the page and any nested
 * component can all call it and only one session lookup happens per request.
 *
 * Reads request headers (cookies) → it's runtime data, so with
 * cacheComponents any component calling it must render inside <Suspense>.
 */
export const getViewer = cache(async (): Promise<UserSummaryDTO | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const { id, name, username, image } = session.user
  // Typed optional (the field is `required: false` so client sign-up input
  // doesn't need it), but the user.create hook in lib/auth.ts always sets it
  // and the column is NOT NULL.
  if (!username) throw new Error(`User ${id} has no username`)
  return { id, name, username, image: image ?? null }
})
