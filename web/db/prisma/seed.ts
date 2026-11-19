// Dev fixtures: `pnpm run db:seed` (from web/). Idempotent — wipes and
// re-creates the demo data each run.
//
// Demo users can sign in with email/password right away:
//   alice@example.com / bob@example.com / carol@example.com — password: password123
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '../src/client'

const DEMO_PASSWORD = 'password123'

const USERS = [
  { name: 'Alice Johnson', email: 'alice@example.com', username: 'alice' },
  { name: 'Bob Smith', email: 'bob@example.com', username: 'bob' },
  { name: 'Carol Diaz', email: 'carol@example.com', username: 'carol' },
]

const POST_BODIES = [
  'Just moved to a new city — any coffee shop recommendations?',
  'Finished my first marathon today. Legs are jelly, heart is full.',
  'Hot take: pineapple belongs on pizza.',
  'Throwback to last summer at the lake 🌊',
  'Reading “The Pragmatic Programmer” again. Still holds up.',
  'Who else is watching the meteor shower tonight?',
  'Made sourdough from scratch. It only took three attempts!',
  'Our team shipped the new release today 🎉',
  'Looking for hiking buddies this weekend.',
  'Grateful for good friends and long dinners.',
  'Started learning the guitar. My neighbors are thrilled, I’m sure.',
  'Sunsets like this make Mondays bearable.',
]

async function main() {
  await prisma.post.deleteMany()
  await prisma.user.deleteMany({ where: { email: { in: USERS.map((u) => u.email) } } })

  const password = await hashPassword(DEMO_PASSWORD)
  const users = []
  for (const u of USERS) {
    const user = await prisma.user.create({ data: { ...u, emailVerified: true } })
    // Better Auth stores email/password credentials as an Account row with
    // providerId "credential" whose accountId is the user's own ID.
    await prisma.account.create({
      data: { userId: user.id, accountId: user.id, providerId: 'credential', password },
    })
    users.push(user)
  }

  // Insert sequentially, oldest first: Snowflake IDs encode insert time, so
  // the feed's ORDER BY id DESC shows the last body first.
  for (let i = 0; i < 30; i++) {
    await prisma.post.create({
      data: {
        authorId: users[i % users.length]!.id,
        body: `${POST_BODIES[i % POST_BODIES.length]} (#${i + 1})`,
      },
    })
  }

  console.log(`Seeded ${users.length} users and 30 posts. Password for all: ${DEMO_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
