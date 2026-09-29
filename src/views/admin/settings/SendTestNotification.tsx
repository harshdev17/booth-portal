'use client'

import { useActionState, useState } from 'react'

import { CheckCircle2Icon, Loader2Icon, SendIcon, XCircleIcon } from 'lucide-react'

import { sendTestNotification, type SendTestMessageState } from '@/app/server/notification-test-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'otp', label: 'OTP Verification' },
  { value: 'application_confirmation', label: 'Application Confirmation' },
  { value: 'payment_confirmation', label: 'Payment Confirmation' },
  { value: 'status_update', label: 'Status Update' },
  { value: 'document_query', label: 'Document Query' },
  { value: 'pay_now_activation', label: 'Pay Now Activation' },
  { value: 'reminder', label: 'Reminder' }
]

const initialState: SendTestMessageState = {}

/**
 * Admin-only panel to send a real WhatsApp test message for any category,
 * to verify a template/campaign actually works before relying on it in a
 * real applicant flow — see src/app/server/notification-test-actions.ts.
 * Sends only to the mobile number typed here, never an applicant's number.
 */
const SendTestNotification = () => {
  const [state, formAction, isPending] = useActionState(sendTestNotification, initialState)
  const [category, setCategory] = useState('otp')

  return (
    <Card className='shadow-xs'>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <CardTitle className='text-base font-bold text-[#0c2847]'>Send Test Message</CardTitle>
        <CardDescription className='text-xs'>
          Sends a real WhatsApp message using sample data, to a number you provide — verifies the category&apos;s
          template/campaign actually works, the same way a real notification would send.
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-6'>
        <form action={formAction} className='flex flex-col gap-4'>
          <input type='hidden' name='category' value={category} />

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Category</label>
              <Select value={category} onValueChange={value => setCategory(value ?? 'otp')}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Mobile Number</label>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>+91</span>
                <Input
                  name='mobileNumber'
                  placeholder='9876543210'
                  maxLength={10}
                  required
                  pattern='[6-9][0-9]{9}'
                  title='Enter a valid 10-digit Indian mobile number'
                />
              </div>
            </div>
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
            {isPending ? <Loader2Icon className='animate-spin' /> : <SendIcon />}
            Send Test Message
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default SendTestNotification
