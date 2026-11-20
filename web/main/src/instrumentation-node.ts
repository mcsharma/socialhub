import { prisma } from '@socialhub/db'

/**
 * Fail fast with an actionable message if Postgres isn't reachable — much
 * clearer than a raw ECONNREFUSED surfacing inside the first page render.
 */
export async function assertDatabaseReachable() {
  // `next build` doesn't need a database (all DB reads are per-request).
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    const maskedUrl = (process.env.DATABASE_URL ?? '(not set)').replace(
      /:[^:@/]*@/,
      ':****@',
    )
    const fix =
      process.env.NODE_ENV === 'production'
        ? 'Check DATABASE_URL and that the database is reachable from this environment.'
        : "If local Postgres isn't running yet, start it from the repo root:\n\n  docker compose up -d\n\nThen restart the dev server."
    console.error(
      `\nCould not connect to the database (DATABASE_URL: ${maskedUrl}).\n\n${fix}\n`,
    )
    process.exit(1)
  }
}
