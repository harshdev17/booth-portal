'use client'

import { useActionState } from 'react'

import { CheckCircle2Icon, Loader2Icon, PlugZapIcon, XCircleIcon } from 'lucide-react'

import { testRazorpayConnection, type TestRazorpayConnectionState } from '@/app/server/razorpay-test-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const initialState: TestRazorpayConnectionState = {}

/**
 * Admin-only connectivity check: creates one real ₹1 test order via the
 * live Razorpay API using the configured key ID/secret, proving the
 * integration actually works end to end — the same way SendTestNotification
 * proves the WhatsApp integration works (see
 * src/app/server/razorpay-test-actions.ts). Never touches a real
 * application or the `payments` table.
 */
const TestRazorpayConnection = () => {
  const [state, formAction, isPending] = useActionState(testRazorpayConnection, initialState)

  return (
    <Card className='shadow-xs'>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <CardTitle className='text-base font-bold text-[#0c2847]'>Test Razorpay Connection</CardTitle>
        <CardDescription className='text-xs'>
          Creates one real ₹1 test order via the live Razorpay API to verify RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
          are valid and reachable. Does not charge anyone or touch any application record.
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-6'>
        <form action={formAction} className='flex flex-col gap-4'>
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
            {isPending ? <Loader2Icon className='animate-spin' /> : <PlugZapIcon />}
            Run Test
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default TestRazorpayConnection
