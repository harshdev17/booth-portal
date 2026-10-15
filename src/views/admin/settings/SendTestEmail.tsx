'use client'

import { useActionState } from 'react'

import { CheckCircle2Icon, Loader2Icon, MailIcon, XCircleIcon } from 'lucide-react'

import { sendTestEmail, type SendTestEmailState } from '@/app/server/email-test-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const initialState: SendTestEmailState = {}

/** Admin-only: verifies the email connection by sending one test email to an address typed here. */
const SendTestEmail = () => {
  const [state, formAction, isPending] = useActionState(sendTestEmail, initialState)

  return (
    <Card className='shadow-xs'>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <CardTitle className='text-base font-bold text-[#0c2847]'>Send Test Email</CardTitle>
        <CardDescription className='text-xs'>
          Sends one test email to the address you enter, to check that the email connection works.
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-6'>
        <form action={formAction} className='flex flex-col gap-4'>
          <div className='flex max-w-md flex-col gap-1.5'>
            <label htmlFor='test-email' className='text-xs font-semibold text-slate-700'>
              Email address
            </label>
            <Input id='test-email' name='email' type='email' placeholder='name@example.com' required />
          </div>

          {state.error && (
            <div className='flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700'>
              <XCircleIcon className='mt-0.5 size-3.5 shrink-0' />
              <span>{state.error}</span>
            </div>
          )}

          {state.success && (
            <div className='flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700'>
              <CheckCircle2Icon className='mt-0.5 size-3.5 shrink-0' />
              <span>{state.success}</span>
            </div>
          )}

          <Button type='submit' disabled={isPending} className='w-fit'>
            {isPending ? <Loader2Icon className='animate-spin' /> : <MailIcon />}
            Send Test Email
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default SendTestEmail
