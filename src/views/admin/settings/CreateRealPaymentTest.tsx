'use client'

import { useActionState, useState } from 'react'

import Link from 'next/link'

import { AlertTriangleIcon, CheckCircle2Icon, ExternalLinkIcon, Loader2Icon, ReceiptIndianRupeeIcon, XCircleIcon } from 'lucide-react'

import { createRealPaymentTestApplication, type CreatePaymentTestState } from '@/app/server/payment-test-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { storeApplicationAccess } from '@/views/public/apply/access-session'

const initialState: CreatePaymentTestState = {}

type CategoryOption = { slug: string; name: string; feePaise: number }

/**
 * Admin-only "real payment" test tool — distinct from TestRazorpayConnection
 * (which only proves the API keys work). This creates one real, throwaway
 * application via the exact same code path a real applicant uses, sends a
 * real WhatsApp OTP to the mobile number entered here, then hands off to
 * the real public Review page (in this same browser tab, via
 * storeApplicationAccess — the same sessionStorage handoff the real apply
 * flow uses) to finish the two steps no server code can automate: entering
 * the real OTP and completing the real Razorpay checkout UI.
 */
const CreateRealPaymentTest = ({ categories }: { categories: CategoryOption[] }) => {
  const [state, formAction, isPending] = useActionState(createRealPaymentTestApplication, initialState)
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? '')

  const selectedCategory = categories.find(c => c.slug === categorySlug)

  const handleContinue = () => {
    if (!state.success) return

    storeApplicationAccess(state.success.applicationId, state.success.accessToken, state.success.applicationNumber)
    window.location.href = `/apply/${state.success.categorySlug}/review/${state.success.applicationId}`
  }

  return (
    <Card className='shadow-xs border-[#0c2847]/20'>
      <CardHeader className='border-b bg-[#f0f4f8] py-4'>
        <CardTitle className='flex items-center gap-2 text-base font-bold text-[#0c2847]'>
          <ReceiptIndianRupeeIcon className='size-4 text-[#0c2847]' />
          Create Real Payment Test
        </CardTitle>
        <CardDescription className='text-xs'>
          Creates one real, throwaway application (dummy details, your real mobile number) and sends a real WhatsApp
          OTP to it — the exact same path a real applicant follows. You finish it yourself: verify the OTP on the
          Review page, then complete a real Razorpay checkout. This is a genuine transaction using{' '}
          the Razorpay account currently connected — confirm it is a test account before running this if you
          don&apos;t want a real charge.
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-6'>
        {!state.success ? (
          <form action={formAction} className='flex flex-col gap-4'>
            <input type='hidden' name='categorySlug' value={categorySlug} />

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Category</label>
                <Select value={categorySlug} onValueChange={value => setCategorySlug(value ?? categories[0]?.slug ?? '')}>
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name} (₹{(cat.feePaise / 100).toLocaleString('en-IN')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Your Real Mobile Number</label>
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

            {selectedCategory && (
              <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                <AlertTriangleIcon className='size-3.5 shrink-0 text-amber-600' />
                This will charge ₹{(selectedCategory.feePaise / 100).toLocaleString('en-IN')} for real if you complete
                checkout while a live key is configured.
              </p>
            )}

            {state.error && (
              <div className='flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700'>
                <XCircleIcon className='mt-0.5 size-3.5 shrink-0' />
                <span>{state.error}</span>
              </div>
            )}

            <Button type='submit' disabled={isPending || !categorySlug} className='w-fit'>
              {isPending ? <Loader2Icon className='animate-spin' /> : <ReceiptIndianRupeeIcon />}
              Create Test Application &amp; Send OTP
            </Button>
          </form>
        ) : (
          <div className='flex flex-col gap-4'>
            <div className='flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700'>
              <CheckCircle2Icon className='mt-0.5 size-3.5 shrink-0' />
              <span>
                Test application <strong>{state.success.applicationNumber}</strong> created and a real OTP was sent
                to +91{state.success.mobileNumber}. Check WhatsApp for the code.
              </span>
            </div>

            <p className='text-xs text-muted-foreground'>
              Click below to continue in this browser tab — you&apos;ll land on the real Review page, enter the OTP
              you received, and proceed to the real Razorpay checkout to complete the payment.
            </p>

            <Button onClick={handleContinue} className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-white'>
              <ExternalLinkIcon className='size-4' />
              Continue to Review &amp; Payment
            </Button>

            <p className='text-xs text-muted-foreground'>
              Or open{' '}
              <Link
                href={`/apply/${state.success.categorySlug}/review/${state.success.applicationId}`}
                className='font-semibold text-[#0c2847] underline'
              >
                this link
              </Link>{' '}
              directly (only works in this same browser, since the access token is stored in this tab&apos;s session
              storage).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CreateRealPaymentTest
