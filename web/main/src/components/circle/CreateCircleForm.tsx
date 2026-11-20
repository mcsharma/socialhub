'use client'

import { useActionState } from 'react'
import { createCircleAction, type FormState } from '@/lib/actions/circles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreateCircleForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createCircleAction,
    null,
  )
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label htmlFor="circle-name" className="text-sm font-medium">
        Circle name
      </label>
      <div className="flex gap-2">
        <Input
          id="circle-name"
          name="name"
          placeholder="e.g. College friends"
          required
          maxLength={60}
          aria-invalid={state?.ok === false || undefined}
        />
        <Button type="submit" size="md" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create circle'}
        </Button>
      </div>
      {state?.ok === false && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  )
}
