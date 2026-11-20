import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { parseSnowflake } from '@socialhub/db'
import { getCircleForViewer } from '@/lib/dal/circles'
import { CircleTabs } from '@/components/circle/CircleTabs'

/**
 * Shared header for a circle's pages. Non-members get the 404 page — circles
 * are secret, so there's no "you don't have access" page that would confirm
 * a circle exists.
 */
export default function CircleLayout({
  params,
  children,
}: LayoutProps<'/c/[circleId]'>) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense
        fallback={<div className="h-20 animate-pulse rounded-lg bg-muted" />}
      >
        <CircleHeader params={params} />
      </Suspense>
      {children}
    </div>
  )
}

async function CircleHeader({
  params,
}: {
  params: LayoutProps<'/c/[circleId]'>['params']
}) {
  const circleId = parseSnowflake((await params).circleId)
  const circle = circleId === null ? null : await getCircleForViewer(circleId)
  if (!circle) notFound()

  return (
    <header className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
      <h1 className="text-xl font-bold">{circle.name}</h1>
      <CircleTabs circleId={circle.id} memberCount={circle.memberCount} />
    </header>
  )
}
