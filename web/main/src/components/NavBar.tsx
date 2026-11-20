import Link from 'next/link'
import { getViewer } from '@/lib/dal/session'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/UserAvatar'
import { SignOutButton } from '@/components/SignOutButton'

// Static part of the nav: rendered into the prerendered shell.
export function NavBarFrame({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[680px] items-center justify-between gap-4 px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          socialhub
        </Link>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  )
}

// Dynamic part: depends on the session cookie, so it streams in behind
// <Suspense> (see app/layout.tsx).
export async function NavBarViewer() {
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <Button render={<Link href="/login" />} nativeButton={false}>
        Log in
      </Button>
    )
  }
  return (
    <>
      <span className="flex items-center gap-2 py-1 pr-3 pl-1 text-sm font-medium">
        <UserAvatar user={viewer} size="sm" />
        {viewer.name.split(' ')[0]}
      </span>
      <SignOutButton />
    </>
  )
}

export function NavBarViewerSkeleton() {
  return <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
}
