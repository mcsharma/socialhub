import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

// All Better Auth endpoints: /api/auth/sign-in/email, /api/auth/sign-up/email,
// /api/auth/callback/google, /api/auth/get-session, /api/auth/sign-out, …
export const { GET, POST } = toNextJsHandler(auth)
