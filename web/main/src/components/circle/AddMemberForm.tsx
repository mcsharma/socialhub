'use client'

import { useActionState } from 'react'
import { addMemberAction, type FormState } from '@/lib/actions/circles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AddMemberForm({ circleId }: { circleId: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    addMemberAction,
    null,
  )
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="circleId" value={circleId} />
      <label htmlFor="member-identifier" className="text-sm font-medium">
        Add someone by username or email
      </label>
      <div className="flex gap-2">
        <Input
          id="member-identifier"
          name="identifier"
          placeholder="@username or name@example.com"
          required
          autoComplete="off"
          aria-invalid={state?.ok === false || undefined}
        />
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-success-foreground">{state.message}</p>
      )}
    </form>
  )
}
