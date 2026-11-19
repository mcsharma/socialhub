import { createAuthClient } from 'better-auth/react'

// Browser-side Better Auth client — talks to /api/auth/* on the same origin.
// Use from Client Components only; Server Components read the session through
// lib/dal/session.ts instead.
export const authClient = createAuthClient()
