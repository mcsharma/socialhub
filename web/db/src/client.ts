import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './__generated__/prisma/client'

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy web/.env.example to web/.env (see the root README).',
    )
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// One client per process. In dev, Next.js hot-reloads modules on every edit;
// without parking the instance on globalThis each reload would open a fresh
// connection pool until Postgres runs out of connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
