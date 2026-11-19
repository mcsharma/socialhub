import type { Metadata } from 'next'
import { isGoogleEnabled } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Log in' }

// No request data here → fully static, prerendered at build time. The form
// itself is a Client Component that talks to Better Auth from the browser.
export default function LoginPage() {
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <LoginForm googleEnabled={isGoogleEnabled} />
    </div>
  )
}
