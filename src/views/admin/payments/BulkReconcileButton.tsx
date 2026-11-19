'use client'

import { useActionState } from 'react'

import { Loader2Icon, RefreshCwIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { bulkReconcilePaymentsAction, type BulkReconcileActionState } from '@/app/server/payment-bulk-reconcile-actions'

const initialState: BulkReconcileActionState = {}

const BulkReconcileButton = () => {
  const [state, action, isPending] = useActionState(bulkReconcilePaymentsAction, initialState)

  return (
    <div className='flex flex-col gap-2'>
      <form action={action}>
        <Button type='submit' size='sm' variant='outline' disabled={isPending} className='font-semibold'>
          {isPending ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <RefreshCwIcon className='size-3.5 mr-1.5' />}
          Reconcile All Pending with Razorpay
        </Button>
      </form>
      {state.error && (
        <Alert variant='destructive' className='py-2'>
          <AlertDescription className='text-xs'>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert className='border-emerald-200 bg-emerald-50 text-emerald-800 py-2'>
          <AlertDescription className='text-xs'>{state.success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default BulkReconcileButton
