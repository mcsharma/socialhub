import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { parseSnowflake } from '@socialhub/db'
import { getViewer } from '@/lib/dal/session'
import { getCircleForViewer } from '@/lib/dal/circles'
import { getCircleFeedPage } from '@/lib/dal/posts'
import { Composer } from '@/components/feed/Composer'
import { FeedList } from '@/components/feed/FeedList'
import { PostCardSkeleton } from '@/components/post/PostCard'

/**
 * A circle's feed: composer, then every member's posts, newest first. The
 * first page renders on the server; FeedList takes over in the browser.
 */
export async function generateMetadata({
  params,
}: PageProps<'/c/[circleId]'>): Promise<Metadata> {
  const circleId = parseSnowflake((await params).circleId)
  const circle = circleId === null ? null : await getCircleForViewer(circleId)
  return { title: circle?.name ?? 'Not found' }
}

export default function CirclePage({ params }: PageProps<'/c/[circleId]'>) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <CircleFeed params={params} />
    </Suspense>
  )
}

async function CircleFeed({
  params,
}: {
  params: PageProps<'/c/[circleId]'>['params']
}) {
  const circleId = parseSnowflake((await params).circleId)
  if (circleId === null) notFound()
  const [viewer, firstPage] = await Promise.all([
    getViewer(),
    getCircleFeedPage(circleId),
  ])
  if (!viewer || !firstPage) notFound()

  const id = circleId.toString()
  return (
    <>
      <Composer viewer={viewer} circleId={id} />
      <FeedList circleId={id} initialPage={firstPage} />
    </>
  )
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  )
}
