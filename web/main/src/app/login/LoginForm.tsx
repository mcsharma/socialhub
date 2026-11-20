'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type Mode = 'sign-in' | 'sign-up'

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(formData: FormData) {
    setError(null)
    setIsPending(true)
    const email = String(formData.get('email'))
    const password = String(formData.get('password'))
    const { error } =
      mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: String(formData.get('name')),
          })
    setIsPending(false)
    if (error) {
      setError(error.message ?? 'Something went wrong.')
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
      <h1 className="mb-1 text-xl font-bold">
        {mode === 'sign-in' ? 'Log in' : 'Create an account'}
      </h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Demo accounts: alice@example.com / password123 (also bob, carol)
      </p>

      <form action={onSubmit} className="flex flex-col gap-3">
        {mode === 'sign-up' && (
          <Input
            name="name"
            placeholder="Full name"
            required
            autoComplete="name"
          />
        )}
        <Input
          name="email"
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={8}
          autoComplete={
            mode === 'sign-in' ? 'current-password' : 'new-password'
          }
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="md" disabled={isPending}>
          {isPending
            ? 'Please wait…'
            : mode === 'sign-in'
              ? 'Log in'
              : 'Sign up'}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <Separator className="my-5" />
          <Button
            variant="outline"
            size="md"
            className="w-full"
            onClick={() =>
              authClient.signIn.social({ provider: 'google', callbackURL: '/' })
            }
          >
            Continue with Google
          </Button>
        </>
      )}

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {mode === 'sign-in' ? 'New here?' : 'Already have an account?'}{' '}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
          }}
        >
          {mode === 'sign-in' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </div>
  )
}
