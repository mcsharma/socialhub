import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { getViewer } from '@/lib/dal/session'
import { getFeedPage } from '@/lib/dal/posts'
import { Composer } from '@/components/feed/Composer'
import { FeedList } from '@/components/feed/FeedList'
import { PostCardSkeleton } from '@/components/PostCard'

/**
 * Home — the rendering patterns on one page:
 *
 *  1. Static shell: the heading below (and the layout's nav frame) has no
 *     dynamic data, so it's prerendered at build time and sent instantly.
 *  2. Dynamic + streamed: <ComposerSlot> reads the session cookie and <Feed>
 *     queries the DB per request. Each sits in its own <Suspense>, so the
 *     shell isn't blocked on them and they stream in independently.
 *  3. SSR → CSR hand-off: <Feed> renders page one on the server, then
 *     <FeedList> (a Client Component) takes over with SWR for "load more"
 *     and revalidation.
 *  4. Mutation: <Composer> posts through a Server Action.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Feed</h1>

      <Suspense
        fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}
      >
        <ComposerSlot />
      </Suspense>

      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </div>
  )
}

async function ComposerSlot() {
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <p className="rounded-lg border border-border bg-info p-4 text-sm text-info-foreground">
        <Link href="/login" className="font-semibold underline">
          Log in
        </Link>{' '}
        to share a post.
      </p>
    )
  }
  return <Composer viewer={viewer} />
}

async function Feed() {
  // A Prisma query isn't a request API like cookies()/headers(), so tell
  // Next explicitly: this must run per request, never at build time.
  await connection()
  const firstPage = await getFeedPage()
  return <FeedList initialPage={firstPage} />
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  )
}
