import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/dal/session'
import { getViewerCircle } from '@/lib/dal/circles'
import { CreateCircleForm } from '@/components/circle/CreateCircleForm'
import { Button } from '@/components/ui/button'

/**
 * Home: sends members to their circle. Everyone else sees how to get one —
 * sign in, then create a circle or be added to a friend's.
 */
export default function HomePage() {
  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}
    >
      <Home />
    </Suspense>
  )
}

async function Home() {
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6 shadow-xs">
        <h1 className="text-2xl font-bold">Your close friends, in one place</h1>
        <p className="text-muted-foreground">
          socialhub is for small circles of people you actually know. No public
          posts, no strangers.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false} size="md">
          Log in or sign up
        </Button>
      </section>
    )
  }

  const circle = await getViewerCircle()
  if (circle) redirect(`/c/${circle.id.toString()}`)

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6 shadow-xs">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Start a circle</h1>
        <p className="text-muted-foreground">
          A circle is a private group. Only its members can see what’s posted in
          it.
        </p>
      </div>
      <CreateCircleForm />
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        Or ask a friend to add you to theirs. Your username is{' '}
        <span className="font-semibold text-foreground">
          @{viewer.username}
        </span>
        .
      </p>
    </section>
  )
}
