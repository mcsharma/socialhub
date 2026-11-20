import { prisma } from '@socialhub/db'
import { ensureBucketExists } from '@/lib/storage'

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

/**
 * Development only: make sure object storage is up and the bucket exists, so
 * photo uploads work on a fresh `docker compose up -d`. Production buckets are
 * provisioned ahead of time.
 */
export async function ensureDevStorage() {
  if (process.env.NODE_ENV !== 'development') return
  try {
    await ensureBucketExists()
  } catch (error) {
    console.error(
      `\nCould not reach object storage at ${process.env.S3_ENDPOINT ?? '(S3_ENDPOINT not set)'}: ${String(error)}\n\n` +
        "Photo uploads won't work. If the local SeaweedFS container isn't running, start it from the repo root:\n\n  docker compose up -d\n",
    )
  }
}
