import 'server-only'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { generateUniqueUsername, prisma } from '@socialhub/db'

// Reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from the environment
// (web/.env). Mounted at /api/auth/* by app/api/auth/[...all]/route.ts.

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

/** Google sign-in is optional locally — enabled only when credentials exist. */
export const isGoogleEnabled = Boolean(googleClientId && googleClientSecret)

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  advanced: {
    database: {
      // Let Postgres mint IDs: every auth table's id column defaults to
      // next_id() — the same Snowflake generator as the domain tables.
      generateId: false,
    },
  },

  emailAndPassword: { enabled: true },

  socialProviders: isGoogleEnabled
    ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret! } }
    : {},

  user: {
    additionalFields: {
      // Filled server-side by the hook below — clients can't set it.
      username: { type: 'string', required: false, input: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, username: await generateUniqueUsername(user.email) },
        }),
      },
    },
  },

  // Lets Server Actions that call auth.api.* set cookies on the response.
  // Must be the last plugin.
  plugins: [nextCookies()],
})
