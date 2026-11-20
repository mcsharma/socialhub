'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function CircleTabs({
  circleId,
  memberCount,
}: {
  circleId: string
  memberCount: number
}) {
  const pathname = usePathname()
  const tabs = [
    { href: `/c/${circleId}` as const, label: 'Feed' },
    {
      href: `/c/${circleId}/members` as const,
      label: `Members · ${memberCount}`,
    },
  ]
  return (
    <nav className="flex gap-1" aria-label="Circle">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              active && 'bg-secondary text-secondary-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
