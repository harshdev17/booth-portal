'use client'

import { useActionState, useState } from 'react'
import { EyeIcon, EyeOffIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { loginAction, type LoginFormState } from '@/app/server/auth-actions'

const initialState: LoginFormState = {}

export default function PoliceLoginForm() {
  const [isVisible, setIsVisible] = useState(false)
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <form action={formAction}>
      <FieldGroup className='gap-4'>
        {state.error && (
          <Alert variant='destructive'>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Field className='gap-2' data-invalid={!!state.fieldErrors?.email}>
          <FieldLabel htmlFor='email' className='leading-5 font-semibold text-slate-700'>
            Police Official Email / ID*
          </FieldLabel>
          <Input
            type='email'
            id='email'
            name='email'
            placeholder='officer@police.gov.in'
            autoComplete='username'
            required
            className='border-slate-300 focus:border-[#0c2847] focus:ring-[#0c2847]'
          />
          {state.fieldErrors?.email && <FieldError>{state.fieldErrors.email}</FieldError>}
        </Field>

        <Field className='w-full gap-2' data-invalid={!!state.fieldErrors?.password}>
          <FieldLabel htmlFor='password' className='leading-5 font-semibold text-slate-700'>
            Security Passcode*
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='password'
              name='password'
              type={isVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              autoComplete='current-password'
              required
              className='border-slate-300'
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setIsVisible(prevState => !prevState)}
                className='text-muted-foreground rounded-l-none hover:bg-transparent'
              >
                {isVisible ? <EyeOffIcon className='size-4' /> : <EyeIcon className='size-4' />}
                <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
          {state.fieldErrors?.password && <FieldError>{state.fieldErrors.password}</FieldError>}
        </Field>

        <Field className='pt-2'>
          <Button
            className='w-full bg-[#0c2847] hover:bg-[#12365c] text-white font-semibold flex items-center justify-center gap-2 py-2.5 rounded-lg shadow-sm transition'
            type='submit'
            disabled={isPending}
          >
            {isPending ? (
              <Loader2Icon className='size-4 animate-spin' />
            ) : (
              <ShieldCheckIcon className='size-4 text-emerald-400' />
            )}
            Sign In to Police Portal
          </Button>
        </Field>

        <p className='text-center text-xs text-muted-foreground pt-1'>
          Authorized law enforcement personnel only. All access attempts are digitally recorded.
        </p>
      </FieldGroup>
    </form>
  )
}
