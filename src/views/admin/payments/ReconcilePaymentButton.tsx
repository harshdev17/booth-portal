'use client'

import { useActionState } from 'react'

import { Loader2Icon, RefreshCwIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { reconcilePaymentAction, type ReconcileActionState } from '@/app/server/payment-reconcile-actions'

const initialState: ReconcileActionState = {}

const ReconcilePaymentButton = ({ paymentId }: { paymentId: number }) => {
  const [state, action, isPending] = useActionState(reconcilePaymentAction, initialState)

  return (
    <div className='flex flex-col gap-2'>
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
      <form action={action}>
        <input type='hidden' name='paymentId' value={paymentId} />
        <Button type='submit' size='sm' variant='outline' disabled={isPending}>
          {isPending ? <Loader2Icon className='animate-spin' /> : <RefreshCwIcon />}
          Reconcile with Razorpay
        </Button>
      </form>
      <p className='text-xs text-muted-foreground'>
        Fetches this order&apos;s real payment status directly from Razorpay and marks it successful here if Razorpay
        confirms a captured payment. Use this if the applicant paid but this page still shows pending.
      </p>
    </div>
  )
}

export default ReconcilePaymentButton
