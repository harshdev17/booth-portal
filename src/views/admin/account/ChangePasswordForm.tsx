'use client'

import { useActionState } from 'react'

import { Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { changePasswordAction, type ChangePasswordState } from '@/app/server/account-actions'

const initialState: ChangePasswordState = {}

const ChangePasswordForm = () => {
  const [state, action, isPending] = useActionState(changePasswordAction, initialState)

  return (
    <form action={action} className='flex flex-col gap-4'>
      {state.error && (
        <Alert variant='destructive'>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert className='border-emerald-200 bg-emerald-50 text-emerald-800'>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className='flex flex-col gap-2'>
        <Label htmlFor='currentPassword'>Current Password</Label>
        <Input id='currentPassword' name='currentPassword' type='password' required autoComplete='current-password' />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='newPassword'>New Password</Label>
        <Input
          id='newPassword'
          name='newPassword'
          type='password'
          required
          minLength={8}
          autoComplete='new-password'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='confirmPassword'>Confirm New Password</Label>
        <Input
          id='confirmPassword'
          name='confirmPassword'
          type='password'
          required
          minLength={8}
          autoComplete='new-password'
        />
      </div>

      <Button type='submit' disabled={isPending} className='w-fit'>
        {isPending && <Loader2Icon className='animate-spin' />}
        Update Password
      </Button>
    </form>
  )
}

export default ChangePasswordForm
