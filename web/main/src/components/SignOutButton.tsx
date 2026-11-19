'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon-md"
      aria-label="Sign out"
      onClick={async () => {
        await authClient.signOut()
        // Re-render Server Components so session-dependent UI updates.
        router.refresh()
      }}
    >
      <LogOut />
    </Button>
  )
}
