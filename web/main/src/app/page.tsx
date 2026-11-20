import { Suspense } from 'react'
import Link from 'next/link'
import { getViewer } from '@/lib/dal/session'

// Placeholder home page until the circle feed is built.
export default function HomePage() {
  return (
    <Suspense
      fallback={<div className="h-12 animate-pulse rounded-lg bg-muted" />}
    >
      <Welcome />
    </Suspense>
  )
}

async function Welcome() {
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <p className="text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary underline">
          Log in
        </Link>{' '}
        to see your circle.
      </p>
    )
  }
  return <p className="text-muted-foreground">Signed in as {viewer.name}.</p>
}
