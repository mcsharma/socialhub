import path from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// The whole web workspace shares one env file: web/.env (see .env.example).
config({ path: path.resolve(import.meta.dirname, '../.env'), quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Deliberately process.env (not prisma's `env()` helper, which throws when
    // unset): `prisma generate` runs on every `pnpm install` and doesn't need a
    // database, so a fresh clone can install before web/.env exists.
    // Commands that DO need the DB (migrate, seed, studio) fail clearly on an
    // empty URL instead.
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
})
