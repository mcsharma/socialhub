import { prisma } from '../client'

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, image: true, createdAt: true },
  })
}

/**
 * Derives a unique username from an email's local part ("Jane.Doe@x.com" →
 * "janedoe", then "janedoe-2", …). Used when a user signs up, since neither
 * email/password nor Google sign-up asks for a username.
 */
export async function generateUniqueUsername(email: string): Promise<string> {
  const base =
    email
      .split('@')[0]!
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 30) || 'user'
  let candidate = base
  let suffix = 2
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix++}`
  }
  return candidate
}
