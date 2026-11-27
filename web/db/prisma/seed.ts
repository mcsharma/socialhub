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
import { createComment } from '../src/queries/comments'
import { createPost } from '../src/queries/posts'
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

const REPLY_BODIES = ['Thanks!', 'Haha, right?', 'Next time for sure.']

const REACTIONS: ReactionType[] = ['LIKE', 'LOVE', 'HAHA', 'SAD', 'ANGRY']

async function main() {
  const emails = CIRCLES.flatMap((c) => c.members.map((m) => m.email))

  // Deleting a circle cascades to its members, posts and feedback targets
  // (and so every reaction and comment in it); deleting a user cascades to
  // sessions, accounts and everything they authored.
  await prisma.circle.deleteMany({
    where: { members: { some: { user: { email: { in: emails } } } } },
  })
  await prisma.user.deleteMany({ where: { email: { in: emails } } })

  const password = await hashPassword(DEMO_PASSWORD)
  const totals = { users: 0, posts: 0, reactions: 0, comments: 0, replies: 0 }

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
    // so the feed's ORDER BY id DESC shows the last body first. Posts and
    // comments are created through @socialhub/db's helpers so each gets its
    // feedback target. Counts are filled in by database triggers.
    for (let i = 0; i < c.postCount; i++) {
      const author = users[i % users.length]!
      const post = await createPost({
        authorId: author.id,
        circleId: circle.id,
        body: `${POST_BODIES[i % POST_BODIES.length]} (#${i + 1})`,
        mediaIds: [],
      })

      // Varied reactions from other members.
      const reactions = users
        .filter((u, j) => u.id !== author.id && (i + j) % 3 !== 0)
        .map((u, j) => ({
          targetId: post!.targetId,
          userId: u.id,
          type: REACTIONS[(i + j) % REACTIONS.length]!,
        }))
      if (reactions.length) {
        await prisma.reaction.createMany({ data: reactions })
      }
      totals.reactions += reactions.length

      if (i % 3 === 0) {
        const commenters = users.filter((u) => u.id !== author.id)
        for (const [j, u] of commenters.entries()) {
          const comment = await createComment({
            parentTargetId: post!.targetId,
            circleId: circle.id,
            authorId: u.id,
            body: COMMENT_BODIES[(i + j) % COMMENT_BODIES.length]!,
          })
          totals.comments++

          // On every other commented post: the post's author reacts to the
          // first comment and replies to it.
          if (j === 0 && i % 2 === 0) {
            await prisma.reaction.create({
              data: {
                targetId: comment.targetId,
                userId: author.id,
                type: 'LOVE',
              },
            })
            totals.reactions++
            await createComment({
              parentTargetId: comment.targetId,
              circleId: circle.id,
              authorId: author.id,
              body: REPLY_BODIES[i % REPLY_BODIES.length]!,
            })
            totals.replies++
          }
        }
      }
    }
    totals.users += users.length
    totals.posts += c.postCount
  }

  console.log(
    `Seeded ${CIRCLES.length} circles, ${totals.users} users, ${totals.posts} posts, ` +
      `${totals.reactions} reactions, ${totals.comments} comments, ${totals.replies} replies. ` +
      `Password for all: ${DEMO_PASSWORD}`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
