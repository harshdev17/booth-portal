'use client'

// React Imports
import { useActionState, useState } from 'react'

// Third-party Imports
import { EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react'

// Components Import
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

// Server Action Import
import { loginAction, type LoginFormState } from '@/app/server/auth-actions'

const initialState: LoginFormState = {}

const LoginForm = () => {
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
          <FieldLabel htmlFor='email' className='leading-5'>
            Email address*
          </FieldLabel>
          <Input
            type='email'
            id='email'
            name='email'
            placeholder='name@kdb.example'
            autoComplete='username'
            required
          />
          {state.fieldErrors?.email && <FieldError>{state.fieldErrors.email}</FieldError>}
        </Field>

        <Field className='w-full gap-2' data-invalid={!!state.fieldErrors?.password}>
          <FieldLabel htmlFor='password' className='leading-5'>
            Password*
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id='password'
              name='password'
              type={isVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              autoComplete='current-password'
              required
            />
            <InputGroupAddon align='inline-end' className='pr-1.5'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => setIsVisible(prevState => !prevState)}
                className='text-muted-foreground rounded-l-none hover:bg-transparent'
              >
                {isVisible ? <EyeOffIcon /> : <EyeIcon />}
                <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
          {state.fieldErrors?.password && <FieldError>{state.fieldErrors.password}</FieldError>}
        </Field>

        <Field>
          <Button className='w-full' type='submit' disabled={isPending}>
            {isPending && <Loader2Icon className='animate-spin' />}
            Sign in
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default LoginForm
