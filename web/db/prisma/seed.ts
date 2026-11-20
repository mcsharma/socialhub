// Dev fixtures: `pnpm run db:seed` (from web/). Idempotent — wipes and
// re-creates the demo data each run. Only demo users' circles and data are
// touched; anything else you created locally is left alone.
//
// Demo users (password for all: password123):
//   alice, bob, carol @example.com — circle "Friends"
//   dave, erin @example.com        — circle "Book club"
// Two circles so circle privacy can be checked: neither sees the other.
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '../src/client'
import type { ReactionType } from '../src/__generated__/prisma/enums'

const DEMO_PASSWORD = 'password123'

const CIRCLES = [
  {
    name: 'Friends',
    postCount: 30,
    members: [
      { name: 'Alice Johnson', email: 'alice@example.com', username: 'alice' },
      { name: 'Bob Smith', email: 'bob@example.com', username: 'bob' },
      { name: 'Carol Diaz', email: 'carol@example.com', username: 'carol' },
    ],
  },
  {
    name: 'Book club',
    postCount: 6,
    members: [
      { name: 'Dave Lee', email: 'dave@example.com', username: 'dave' },
      { name: 'Erin Park', email: 'erin@example.com', username: 'erin' },
    ],
  },
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

const COMMENT_BODIES = [
  'Love this!',
  'Count me in.',
  'Haha, so true.',
  'Wish I’d been there.',
  'Congrats!!',
]

const REACTIONS: ReactionType[] = ['LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY']

async function main() {
  const emails = CIRCLES.flatMap((c) => c.members.map((m) => m.email))

  // Deleting a circle cascades to its members and posts (and their media
  // links, reactions and comments); deleting a user cascades to sessions,
  // accounts and everything they authored.
  await prisma.circle.deleteMany({
    where: { members: { some: { user: { email: { in: emails } } } } },
  })
  await prisma.user.deleteMany({ where: { email: { in: emails } } })

  const password = await hashPassword(DEMO_PASSWORD)
  const totals = { users: 0, posts: 0, reactions: 0, comments: 0 }

  for (const c of CIRCLES) {
    const users = []
    for (const m of c.members) {
      const user = await prisma.user.create({
        data: { ...m, emailVerified: true },
      })
      // Better Auth stores email/password credentials as an Account row with
      // providerId "credential" whose accountId is the user's own ID.
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password,
        },
      })
      users.push(user)
    }
    const [creator, ...rest] = users
    const circle = await prisma.circle.create({
      data: {
        name: c.name,
        createdById: creator!.id,
        members: {
          create: [
            { userId: creator!.id },
            ...rest.map((u) => ({ userId: u.id, addedById: creator!.id })),
          ],
        },
      },
    })

    // Insert sequentially, oldest first: Snowflake IDs encode insert time,
    // so the feed's ORDER BY id DESC shows the last body first.
    for (let i = 0; i < c.postCount; i++) {
      const author = users[i % users.length]!
      const post = await prisma.post.create({
        data: {
          circleId: circle.id,
          authorId: author.id,
          body: `${POST_BODIES[i % POST_BODIES.length]} (#${i + 1})`,
        },
      })

      // Varied reactions from other members. Counts on the post are filled
      // in by the database triggers, not here.
      const reactions = users
        .filter((u, j) => u.id !== author.id && (i + j) % 3 !== 0)
        .map((u, j) => ({
          postId: post.id,
          userId: u.id,
          type: REACTIONS[(i + j) % REACTIONS.length]!,
        }))
      if (reactions.length) {
        await prisma.postReaction.createMany({ data: reactions })
      }

      if (i % 3 === 0) {
        const commenters = users.filter((u) => u.id !== author.id)
        for (const [j, u] of commenters.entries()) {
          await prisma.comment.create({
            data: {
              postId: post.id,
              authorId: u.id,
              body: COMMENT_BODIES[(i + j) % COMMENT_BODIES.length]!,
            },
          })
          totals.comments++
        }
      }
      totals.reactions += reactions.length
    }
    totals.users += users.length
    totals.posts += c.postCount
  }

  console.log(
    `Seeded ${CIRCLES.length} circles, ${totals.users} users, ${totals.posts} posts, ` +
      `${totals.reactions} reactions, ${totals.comments} comments. ` +
      `Password for all: ${DEMO_PASSWORD}`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
