'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { AlertCircleIcon, Loader2Icon, PrinterIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/LanguageContext'
import { findAccessTokenForApplicationNumber } from '@/views/public/apply/access-session'

type ReceiptData = {
  applicationNumber: string
  organisationName: string
  representativeName: string
  categoryName: string
  categoryNameHi: string | null
  amountPaise: number | null
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  paidAt: string | null
}

const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

/**
 * Payment receipt for an applicant's own just-submitted/just-paid
 * application — same session-scoped access-token ownership model as the
 * Success and Print Application pages (see access-session.ts). Reachable
 * only from the Success page's "Download Payment Receipt" button within the
 * same browser tab; there is deliberately no OTP-gated lookup flow here like
 * /print-application has, since a receipt is only meaningful right after
 * paying, not as a later look-up (the applicant already has WhatsApp/SMS
 * payment confirmation and can use Print Application for a later copy of
 * their application details).
 */
const ReceiptPageView = ({ applicationNumber }: { applicationNumber: string }) => {
  const router = useRouter()
  const { lang } = useLanguage()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const access = findAccessTokenForApplicationNumber(applicationNumber)

    if (!access) {
      setError(
        lang === 'hi'
          ? 'यह रसीद केवल उसी ब्राउज़र टैब में उपलब्ध है जहां आवेदन जमा किया गया था।'
          : 'This receipt is only available in the same browser tab where the application was submitted.'
      )
      setIsLoading(false)

      return
    }

    const loadReceipt = async () => {
      try {
        const response = await fetch(`/api/applications/${access.applicationId}/receipt`, {
          headers: { Authorization: `Bearer ${access.accessToken}` }
        })

        const body = await response.json()

        if (!response.ok) {
          setError(
            body.error ??
              (lang === 'hi' ? 'भुगतान रसीद उपलब्ध नहीं है।' : 'Payment receipt is not available.')
          )

          return
        }

        setReceipt(body)
      } catch {
        setError(
          lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadReceipt()
  }, [applicationNumber, lang])

  useEffect(() => {
    if (!receipt) return

    const previousTitle = document.title

    document.title = `Receipt-${receipt.applicationNumber}`

    return () => {
      document.title = previousTitle
    }
  }, [receipt])

  return (
    <div className='kdb-print-sheet-page mx-auto max-w-2xl px-4 py-16 sm:px-6 print:max-w-none print:p-0'>
      <div className='print:hidden'>
        <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>
          {lang === 'hi' ? 'भुगतान रसीद' : 'Payment Receipt'}
        </h1>
        <p className='mb-8 text-[var(--kdb-muted)]'>
          {lang === 'hi'
            ? 'आपके आवेदन शुल्क के सफल भुगतान की रसीद।'
            : 'Receipt for your successful application fee payment.'}
        </p>
      </div>

      {isLoading && (
        <div className='flex items-center justify-center gap-2 py-12 text-sm text-[var(--kdb-muted)]'>
          <Loader2Icon className='size-4 animate-spin' />
          <span>{lang === 'hi' ? 'रसीद लोड हो रही है...' : 'Loading receipt...'}</span>
        </div>
      )}

      {!isLoading && error && (
        <Alert variant='destructive'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && receipt && (
        <div className='flex flex-col gap-6 print:block print:gap-0'>
          <Button type='button' onClick={() => window.print()} className='w-fit print:hidden'>
            <PrinterIcon />
            {lang === 'hi' ? 'प्रिंट करें' : 'Print'}
          </Button>

          {/* kdb-print-sheet: see print-application's view for why colors
              here are fixed black-on-white rather than the site's themed
              --kdb-* variables (print/PDF engines don't reliably render
              those unless "background graphics" is on). */}
          <div className='kdb-print-sheet mx-auto w-full max-w-3xl border border-[var(--kdb-border)] bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none'>
            <div className='mb-6 flex items-center gap-4 border-b-2 border-black pb-4 print:border-b-2 print:border-black'>
              <div className='relative size-14 shrink-0'>
                <Image src='/images/public/logo.webp' alt='' fill className='object-contain' />
              </div>
              <div>
                <h2 className='text-lg font-extrabold text-black'>
                  {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}
                </h2>
                <p className='text-xs text-black'>
                  {lang === 'hi'
                    ? 'कुरुक्षेत्र विकास बोर्ड — बूथ/स्टॉल आवंटन पोर्टल'
                    : 'Kurukshetra Development Board — Booth/Stall Allotment Portal'}
                </p>
              </div>
            </div>

            <div className='mb-6 flex items-center justify-between'>
              <h3 className='text-base font-extrabold tracking-wide text-black uppercase'>
                {lang === 'hi' ? 'भुगतान रसीद' : 'Payment Receipt'}
              </h3>
              <span className='rounded-full border border-black px-3 py-1 text-xs font-bold text-black'>
                {lang === 'hi' ? 'भुगतान सफल' : 'Payment Successful'}
              </span>
            </div>

            <dl className='grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2'>
              <ReceiptRow label={lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number'} value={receipt.applicationNumber} />
              <ReceiptRow
                label={lang === 'hi' ? 'श्रेणी' : 'Category'}
                value={lang === 'hi' ? (receipt.categoryNameHi ?? receipt.categoryName) : receipt.categoryName}
              />
              <ReceiptRow label={lang === 'hi' ? 'संगठन/व्यक्ति का नाम' : 'Organisation / Applicant Name'} value={receipt.organisationName} />
              <ReceiptRow label={lang === 'hi' ? 'प्रतिनिधि का नाम' : 'Representative Name'} value={receipt.representativeName} />
              {receipt.amountPaise !== null && (
                <ReceiptRow label={lang === 'hi' ? 'भुगतान राशि' : 'Amount Paid'} value={formatRupees(receipt.amountPaise)} />
              )}
              {receipt.razorpayPaymentId && (
                <ReceiptRow label={lang === 'hi' ? 'भुगतान आईडी' : 'Payment ID'} value={receipt.razorpayPaymentId} mono />
              )}
              {receipt.razorpayOrderId && (
                <ReceiptRow label={lang === 'hi' ? 'ऑर्डर आईडी' : 'Order ID'} value={receipt.razorpayOrderId} mono />
              )}
              {receipt.paidAt && (
                <ReceiptRow
                  label={lang === 'hi' ? 'भुगतान तिथि' : 'Payment Date'}
                  value={new Date(receipt.paidAt).toLocaleString('en-IN')}
                />
              )}
            </dl>

            <div className='mt-10 flex items-end justify-between border-t border-black pt-4 text-xs text-black'>
              <p>
                {lang === 'hi'
                  ? 'यह एक कंप्यूटर-जनित रसीद है और इसके लिए हस्ताक्षर की आवश्यकता नहीं है।'
                  : 'This is a computer-generated receipt and does not require a signature.'}
              </p>
              <p>{new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <button
            type='button'
            onClick={() => router.push('/')}
            className='mx-auto text-sm text-[var(--kdb-muted)] underline underline-offset-2 hover:text-[var(--kdb-primary)] print:hidden'
          >
            {lang === 'hi' ? 'होम पर वापस जाएं' : 'Return to Home'}
          </button>
        </div>
      )}
    </div>
  )
}

const ReceiptRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase print:text-black'>{label}</dt>
    <dd className={`font-semibold text-[var(--kdb-primary)] break-words print:text-black ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
)

export default ReceiptPageView
