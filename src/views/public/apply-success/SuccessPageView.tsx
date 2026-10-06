'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AlertCircleIcon, CopyIcon, Loader2Icon, PrinterIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/context/LanguageContext'
import { findAccessTokenForApplicationNumber } from '@/views/public/apply/access-session'

type StatusResponse = { categoryName: string; submittedAt: string | null }

const SuccessPageView = ({
  applicationNumber,
  encryptedToken
}: {
  applicationNumber: string
  encryptedToken: string
}) => {
  const router = useRouter()
  const { lang } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [details, setDetails] = useState<StatusResponse | null>(null)

  const [access] = useState(() => findAccessTokenForApplicationNumber(applicationNumber))
  const accessToken = access?.accessToken ?? null
  const [loadError, setLoadError] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [isFetchingReceipt, setIsFetchingReceipt] = useState(false)
  const [isFetchingPrint, setIsFetchingPrint] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/applications/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationNumber, accessToken })
        })

        const body = await response.json()

        if (response.ok) setDetails(body)
      } catch {
        setLoadError(
          lang === 'hi'
            ? 'पूर्ण पुष्टिकरण विवरण लोड नहीं हो सका, लेकिन आपका आवेदन सफलतापूर्वक जमा हो गया है।'
            : 'Could not load full confirmation details, but your application was submitted successfully.'
        )
      }
    }

    void loadStatus()
  }, [accessToken, applicationNumber, lang])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(applicationNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Non-fatal — the number remains visible on screen.
    }
  }

  // Confirms a successful payment actually exists before navigating, so a
  // draft/payment-pending applicant gets a clear inline message instead of
  // landing on a receipt page that just says "not found".
  const goToReceipt = async () => {
    if (!access) return

    setReceiptError(null)
    setIsFetchingReceipt(true)

    try {
      const response = await fetch(`/api/applications/${access.applicationId}/receipt`, {
        headers: { Authorization: `Bearer ${access.accessToken}` }
      })

      if (!response.ok) {
        const body = await response.json()

        setReceiptError(
          body.error ??
            (lang === 'hi'
              ? 'भुगतान रसीद अभी उपलब्ध नहीं है।'
              : 'Payment receipt is not available yet.')
        )

        return
      }

      router.push(`/apply/receipt/${encryptedToken}`)
    } catch {
      setReceiptError(
        lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsFetchingReceipt(false)
    }
  }

  // Mirrors goToReceipt() — confirms the submitted application is actually
  // fetchable with the session's access token before navigating, so this
  // never requires the OTP-gated /print-application lookup flow.
  const goToPrint = async () => {
    if (!access) return

    setPrintError(null)
    setIsFetchingPrint(true)

    try {
      const response = await fetch(`/api/applications/${access.applicationId}/print`, {
        headers: { Authorization: `Bearer ${access.accessToken}` }
      })

      if (!response.ok) {
        const body = await response.json()

        setPrintError(
          body.error ??
            (lang === 'hi' ? 'आवेदन अभी उपलब्ध नहीं है।' : 'Application is not available yet.')
        )

        return
      }

      router.push(`/apply/print/${encryptedToken}`)
    } catch {
      setPrintError(
        lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsFetchingPrint(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center'>
      <div className='w-full max-w-xl text-center'>
        {/* Header with Home Theme Ornamental Divider */}
        <div className='mb-6 flex flex-col items-center'>
          <div className='mb-2 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026
            </span>
            <div className='relative h-3.5 w-28 sm:w-36 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
                priority
              />
            </div>
          </div>
        </div>

        <h1 className='text-2xl sm:text-3xl font-black text-[#0c2847] tracking-tight mb-2'>
          {lang === 'hi' ? 'आवेदन सफलतापूर्वक जमा हुआ!' : 'Application Submitted Successfully!'}
        </h1>
        {details?.categoryName ? (
          <p className='mb-6 text-sm text-[#475569]'>
            {lang === 'hi' ? (
              <>
                आपका <strong className='text-[#0c2847]'>{details.categoryName}</strong> हेतु स्टॉल आवंटन पंजीकरण कुरुक्षेत्र विकास बोर्ड को प्राप्त हो गया है।
              </>
            ) : (
              <>
                Your stall allotment registration for <strong className='text-[#0c2847]'>{details.categoryName}</strong> has been received by Kurukshetra Development Board.
              </>
            )}
          </p>
        ) : (
          <p className='mb-6 text-sm text-[#475569]'>
            {lang === 'hi'
              ? 'आपका स्टॉल आवंटन पंजीकरण कुरुक्षेत्र विकास बोर्ड को प्राप्त हो गया है।'
              : 'Your stall allotment registration has been received by Kurukshetra Development Board.'}
          </p>
        )}

        {loadError && (
          <Alert variant='destructive' className='mb-6 text-left rounded-xl'>
            <AlertCircleIcon className='size-4' />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Confirmation Card */}
        <div className='mb-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 text-left shadow-xs space-y-5'>
          <div>
            <span className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
              {lang === 'hi' ? 'आवेदन संदर्भ क्रमांक' : 'Application Reference Number'}
            </span>
            <div className='mt-1 flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#faf8f5] px-4 py-3'>
              <span className='font-mono text-lg sm:text-xl font-extrabold text-[#0c2847] tracking-wide'>{applicationNumber}</span>
              <button
                type='button'
                onClick={copy}
                className='inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0c2847] hover:bg-[#f1f5f9] transition active:scale-95 shadow-2xs'
              >
                <CopyIcon className='size-3.5' /> {copied ? (lang === 'hi' ? 'कॉपी हो गया!' : 'Copied!') : lang === 'hi' ? 'कॉपी करें' : 'Copy'}
              </button>
            </div>
          </div>

          {details?.submittedAt && (
            <div className='border-t border-[#f1f5f9] pt-3 text-xs text-[#64748b]'>
              {lang === 'hi' ? 'सबमिट किया गया समय: ' : 'Submitted Timestamp: '}
              <span className='font-semibold text-[#334155]'>{new Date(details.submittedAt).toLocaleString('en-IN')}</span>
            </div>
          )}

          {(receiptError || printError) && (
            <div className='border-t border-[#f1f5f9] pt-4'>
              <Alert variant='destructive' className='rounded-xl'>
                <AlertCircleIcon className='size-4' />
                <AlertDescription>{receiptError ?? printError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Actions live inside the card, not as separate floating rows. */}
          <div className='border-t border-[#f1f5f9] pt-4 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center'>
            {access && (
              <button
                type='button'
                onClick={goToReceipt}
                disabled={isFetchingReceipt}
                className='inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-5 py-2.5 text-sm font-semibold text-[#0c2847] transition hover:border-[#0c2847] hover:bg-[#f8fafc] disabled:pointer-events-none disabled:opacity-60'
              >
                {isFetchingReceipt && <Loader2Icon className='size-4 animate-spin' />}
                <span>{lang === 'hi' ? 'भुगतान रसीद डाउनलोड करें' : 'Download Payment Receipt'}</span>
              </button>
            )}
            {access && (
              <button
                type='button'
                onClick={goToPrint}
                disabled={isFetchingPrint}
                className='inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-5 py-2.5 text-sm font-semibold text-[#0c2847] transition hover:border-[#0c2847] hover:bg-[#f8fafc] disabled:pointer-events-none disabled:opacity-60'
              >
                {isFetchingPrint ? <Loader2Icon className='size-4 animate-spin' /> : <PrinterIcon className='size-4' />}
                <span>{lang === 'hi' ? 'आवेदन प्रिंट करें' : 'Print Application'}</span>
              </button>
            )}
          </div>

          <div className='border-t border-[#f1f5f9] pt-4 flex flex-col-reverse justify-center gap-3 sm:flex-row'>
            <button
              type='button'
              onClick={() => router.push('/')}
              className='inline-flex items-center justify-center rounded-xl border border-[#cbd5e1] bg-white px-6 py-3 text-sm font-bold text-[#0c2847] hover:bg-[#f8fafc] transition'
            >
              <span>{lang === 'hi' ? 'होम पर वापस जाएं' : 'Return to Home'}</span>
            </button>
            <Link
              href='/status'
              className='inline-flex items-center justify-center rounded-xl bg-[#0c2847] px-7 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#06192e] transition active:scale-[0.98]'
            >
              <span>{lang === 'hi' ? 'आवेदन स्थिति ट्रैक करें' : 'Track Application Status'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuccessPageView
