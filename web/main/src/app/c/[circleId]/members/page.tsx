import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { parseSnowflake } from '@socialhub/db'
import { getCircleForViewer, getCircleMembers } from '@/lib/dal/circles'
import { formatMonthYear } from '@/lib/format'
import { AddMemberForm } from '@/components/circle/AddMemberForm'
import { UserAvatar } from '@/components/UserAvatar'

export async function generateMetadata({
  params,
}: PageProps<'/c/[circleId]/members'>): Promise<Metadata> {
  const circleId = parseSnowflake((await params).circleId)
  const circle = circleId === null ? null : await getCircleForViewer(circleId)
  return { title: circle ? `Members · ${circle.name}` : 'Not found' }
}

export default function MembersPage({
  params,
}: PageProps<'/c/[circleId]/members'>) {
  return (
    <Suspense
      fallback={<div className="h-48 animate-pulse rounded-lg bg-muted" />}
    >
      <Members params={params} />
    </Suspense>
  )
}

async function Members({
  params,
}: {
  params: PageProps<'/c/[circleId]/members'>['params']
}) {
  const circleId = parseSnowflake((await params).circleId)
  const members = circleId === null ? null : await getCircleMembers(circleId)
  if (!members) notFound()

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4 shadow-xs">
      <AddMemberForm circleId={circleId!.toString()} />
      <ul className="flex flex-col divide-y divide-border">
        {members.map((m) => (
          <li key={m.user.id} className="flex items-center gap-3 py-3">
            <UserAvatar user={m.user} />
            <div className="min-w-0">
              <p className="font-semibold">{m.user.name}</p>
              <p
                className="text-sm text-muted-foreground"
                suppressHydrationWarning
              >
                @{m.user.username} · joined {formatMonthYear(m.joinedAt)}
                {m.addedBy && ` · added by ${m.addedBy.name}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
