'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  SearchIcon,
  StoreIcon,
  UploadIcon
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/format-date'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'

const RAZORPAY_CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      resolve(true)
      return
    }

    const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = RAZORPAY_CHECKOUT_SCRIPT_SRC
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const lookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')

    // Accepts both the current "IGM-" prefix and the earlier "KDB-" prefix,
    // so applications created before that naming change remain lookupable.
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number, e.g. IGM-2026-123456')
})

type LookupValues = z.infer<typeof lookupSchema>

type DocumentRow = {
  documentKey: string
  label: string
  labelHi: string | null
  verificationStatus: string | null
  verificationRemarks: string | null
  originalFilename: string | null
}

type StatusResult = {
  applicationId: number
  accessToken?: string
  status: string
  stallNumber: string | null
  allotmentPaymentEnabled: boolean
  allotmentAmountPaise: number | null
  allotmentPaymentDeadlineAt: string | null
  allotmentPaymentStatus: string | null
  allotmentPaidAt: string | null
  categoryName: string
  categoryNameHi: string | null
  categorySlug: string
  feePaise: number | null
  feeBasePaise: number | null
  gstPercent: number | null
  submittedAt: string | null
  documents: DocumentRow[]
}

const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  draft: { en: 'Draft', hi: 'ड्राफ्ट' },
  payment_pending: { en: 'Payment Pending', hi: 'भुगतान लंबित' },
  payment_failed: { en: 'Payment Failed', hi: 'भुगतान विफल' },

  // What the applicant sees: payment received simply means "waiting for review".
  payment_success: { en: 'Pending (Under Review)', hi: 'लंबित (समीक्षाधीन)' },
  under_review: { en: 'Pending (Under Review)', hi: 'लंबित (समीक्षाधीन)' },
  query_raised: { en: 'Query Raised', hi: 'स्पष्टीकरण आवश्यक' },
  rejected: { en: 'Rejected', hi: 'अस्वीकृत' },
  selected: { en: 'Approved', hi: 'स्वीकृत' },
  not_selected: { en: 'Not Selected', hi: 'चयनित नहीं' },
  payment_required: { en: 'Payment Required', hi: 'भुगतान आवश्यक' },
  allotted: { en: 'Allotted', hi: 'आबंटित' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आबंटित' }
}

const DOCUMENT_STATUS_HI: Record<string, string> = {
  pending: 'लंबित',
  verified: 'सत्यापित',
  rejected: 'अस्वीकृत',
  query: 'स्पष्टीकरण आवश्यक'
}

// One plain-language line under the status, so the applicant knows what (if
// anything) is expected of them.
const STATUS_HINT: Record<string, { en: string; hi: string }> = {
  payment_pending: { en: 'Your fee payment is not complete yet.', hi: 'आपके आवेदन शुल्क का भुगतान अभी पूरा नहीं हुआ है।' },
  payment_success: { en: 'Your application and documents are being reviewed.', hi: 'आपके आवेदन और दस्तावेज़ों की समीक्षा की जा रही है।' },
  under_review: { en: 'Your application and documents are being reviewed.', hi: 'आपके आवेदन और दस्तावेज़ों की समीक्षा की जा रही है।' },
  selected: { en: 'Your application has been approved.', hi: 'आपका आवेदन स्वीकृत हो गया है।' },
  rejected: { en: 'Your application has been rejected.', hi: 'आपका आवेदन अस्वीकृत कर दिया गया है।' },
  query_raised: {
    en: 'The review team needs a corrected document. Please upload it below.',
    hi: 'समीक्षा टीम को सही दस्तावेज़ चाहिए। कृपया नीचे अपलोड करें।'
  },
  payment_required: {
    en: 'Congratulations! Your booth/stall has been selected. Please complete the allotment payment to confirm your booking.',
    hi: 'बधाई! आपके बूथ/स्टॉल का चयन हो गया है। आबंटन पुष्टि के लिए कृपया आबंटन शुल्क का भुगतान करें।'
  },
  allotted: {
    en: 'Congratulations! Your booth/stall is confirmed and allotted. You can download your official Allotment Letter below.',
    hi: 'बधाई! आपका बूथ/स्टॉल सफलतापूर्वक आबंटित और पुष्टीकृत हो गया है। आप नीचे अपना आधिकारिक आबंटन पत्र डाउनलोड कर सकते हैं।'
  }
}

type Phase = 'lookup' | 'otp' | 'result'

const StatusLookup = () => {
  const { lang } = useLanguage()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('lookup')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [result, setResult] = useState<StatusResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null)
  const [reuploadedKeys, setReuploadedKeys] = useState<string[]>([])

  // Allotment payment state
  const [isPayingAllotment, setIsPayingAllotment] = useState(false)
  const [allotmentPaymentError, setAllotmentPaymentError] = useState<string | null>(null)
  const [allotmentPaymentSuccess, setAllotmentPaymentSuccess] = useState(false)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '' }
  })

  // Prefills from ?appNo=... when arriving via the homepage's status-check
  // search bar (StatusCheckSection.tsx)
  useEffect(() => {
    const appNo = searchParams.get('appNo')

    if (appNo) {
      form.setValue('applicationNumber', appNo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Phase 1: application number triggers a WhatsApp OTP to mobile on file
  const requestOtpForLookup = async (values: LookupValues) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/applications/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? (lang === 'hi' ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।' : 'Something went wrong. Please try again.'))

        return
      }

      if (body.otpRequired) {
        setApplicationNumber(values.applicationNumber)
        setMaskedMobile(body.maskedMobile || '')
        setOtpCode('')
        setPhase('otp')
      } else {
        setApplicationNumber(values.applicationNumber)
        setResult(body)
        setPhase('result')
      }
    } catch {
      setError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Phase 2: application number + the 6-digit code returns status/documents
  const verifyOtpAndFetchStatus = async () => {
    if (!applicationNumber) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/applications/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationNumber, otpCode })
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? (lang === 'hi' ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।' : 'Something went wrong. Please try again.'))

        return
      }

      setResult(body)
      setPhase('result')
    } catch {
      setError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const respondToQuery = async (documentKey: string, file: File) => {
    if (!result) return

    setUploadMessage(null)
    setUploadedFilename(null)
    setUploadingKey(documentKey)

    try {
      const formData = new FormData()

      formData.append('documentKey', documentKey)
      formData.append('file', file)

      const headers: Record<string, string> = {}
      if (result.accessToken) {
        headers['Authorization'] = `Bearer ${result.accessToken}`
      }

      const response = await fetch(`/api/applications/${result.applicationId}/documents`, {
        method: 'POST',
        headers,
        body: formData
      })

      const body = await response.json()

      if (!response.ok) {
        setUploadMessage(body.error ?? (lang === 'hi' ? 'दस्तावेज़ अपलोड विफल रहा।' : 'Upload failed.'))

        return
      }

      setUploadedFilename(file.name)
      setReuploadedKeys(prev => (prev.includes(documentKey) ? prev : [...prev, documentKey]))

      setResult(prev => {
        if (!prev) return null

        return {
          ...prev,
          documents: prev.documents.map(d =>
            d.documentKey === documentKey
              ? { ...d, verificationStatus: 'pending', verificationRemarks: null, originalFilename: file.name }
              : d
          )
        }
      })
    } catch {
      setUploadMessage(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Could not reach the server. Please try again.'
      )
    } finally {
      setUploadingKey(null)
    }
  }

  // Allotment fee payment via Razorpay
  const handlePayAllotmentFee = async () => {
    if (!result || !result.applicationId) return

    setIsPayingAllotment(true)
    setAllotmentPaymentError(null)

    try {
      const loaded = await loadRazorpayCheckoutScript()
      if (!loaded) {
        setAllotmentPaymentError(
          lang === 'hi'
            ? 'पेमेंट गेटवे लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।'
            : 'Could not load payment gateway. Please check your internet connection.'
        )
        setIsPayingAllotment(false)
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (result.accessToken) {
        headers['Authorization'] = `Bearer ${result.accessToken}`
      }

      const orderRes = await fetch(`/api/applications/${result.applicationId}/payment/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purpose: 'pay_now' })
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setAllotmentPaymentError(
          orderData.error ??
            (lang === 'hi' ? 'भुगतान शुरू नहीं हो सका।' : 'Could not initiate allotment payment.')
        )
        setIsPayingAllotment(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const razorpay = new (window as any).Razorpay({
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        order_id: orderData.orderId,
        name: 'Kurukshetra Development Board',
        description:
          lang === 'hi'
            ? `स्टॉल आबंटन शुल्क — ${orderData.applicationNumber}`
            : `Stall Allotment Fee — ${orderData.applicationNumber}`,
        theme: { color: '#0c2847' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`/api/applications/${result.applicationId}/payment/verify`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok) {
              setAllotmentPaymentError(
                verifyData.error ??
                  (lang === 'hi'
                    ? 'भुगतान सत्यापन विफल रहा। यदि राशि कट गई है तो सहायता से संपर्क करें।'
                    : 'Payment verification failed. If amount was deducted, please contact support.')
              )
              setIsPayingAllotment(false)
              return
            }

            setAllotmentPaymentSuccess(true)
            setResult(prev =>
              prev
                ? {
                    ...prev,
                    status: 'allotted',
                    allotmentPaymentStatus: 'success',
                    allotmentPaidAt: new Date().toISOString()
                  }
                : null
            )
            setIsPayingAllotment(false)
          } catch {
            setAllotmentPaymentError(
              lang === 'hi'
                ? 'सत्यापन के दौरान त्रुटि हुई। कृपया सहायता से संपर्क करें।'
                : 'Error verifying payment. Please contact support.'
            )
            setIsPayingAllotment(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingAllotment(false)
          }
        }
      })

      razorpay.open()
    } catch {
      setAllotmentPaymentError(
        lang === 'hi'
          ? 'भुगतान शुरू करने में समस्या आई।'
          : 'An error occurred while starting payment.'
      )
      setIsPayingAllotment(false)
    }
  }

  // Once the last open query is answered the server moves the application
  // back to Under Review; mirror that locally since re-fetching needs a new OTP.
  const hasOpenQuery = result?.documents.some(doc => doc.verificationStatus === 'query') ?? false

  const effectiveStatus =
    result && result.status === 'query_raised' && !hasOpenQuery ? 'under_review' : (result?.status ?? '')

  const statusText = STATUS_LABEL[effectiveStatus]?.[lang === 'hi' ? 'hi' : 'en'] ?? effectiveStatus
  const hint = STATUS_HINT[effectiveStatus]?.[lang === 'hi' ? 'hi' : 'en']

  return (
    <div className='mx-auto max-w-xl px-4 py-12 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>
        {lang === 'hi' ? 'अपने स्टॉल/बूथ आवेदन फॉर्म की स्थिति जांचें' : 'Check Your Stall/Booth Application Status'}
      </h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {phase === 'otp'
          ? lang === 'hi'
            ? `आपके व्हाट्सएप नंबर पर भेजा गया 6-अंकों का कोड दर्ज करें (...${maskedMobile.slice(-4)})।`
            : `Enter the 6-digit code sent to your WhatsApp number ending ${maskedMobile.slice(-4)}.`
          : lang === 'hi'
            ? 'गीता जयंती महोत्सव 2026 के लिए अपने स्टॉल/बूथ के आवेदन फॉर्म की नवीनतम स्थिति देखने के लिए अपना आवेदन क्रमांक दर्ज करें। हम आपके पंजीकृत मोबाइल नंबर पर एक सत्यापन कोड भेजेंगे।'
            : "Enter your application number to check the latest status of your application for Gita Jayanti Mahotsav 2026. We'll send a verification code to your registered mobile number."}
      </p>

      {phase === 'lookup' && (
        <form onSubmit={form.handleSubmit(requestOtpForLookup)} className='flex flex-col gap-4'>
          <Controller
            name='applicationNumber'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number'}</FieldLabel>
                <Input {...field} id={field.name} placeholder='IGM-2026-123456' aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {error && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type='submit' disabled={isLoading}>
            {isLoading ? <Loader2Icon className='animate-spin' /> : <SearchIcon />}
            {lang === 'hi' ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}
          </Button>
        </form>
      )}

      {phase === 'otp' && (
        <div className='flex flex-col gap-4'>
          <Field>
            <FieldLabel htmlFor='otpCode'>{lang === 'hi' ? '6-अंकों का कोड' : '6-Digit Code'}</FieldLabel>
            <Input
              id='otpCode'
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode='numeric'
              placeholder='••••••'
              maxLength={6}
            />
          </Field>

          {error && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type='button' disabled={isLoading || otpCode.length !== 6} onClick={verifyOtpAndFetchStatus}>
            {isLoading && <Loader2Icon className='animate-spin' />}
            {lang === 'hi' ? 'सत्यापित करें और स्थिति देखें' : 'Verify & Check Status'}
          </Button>

          <button
            type='button'
            className='text-sm text-[var(--kdb-muted)] underline underline-offset-2 hover:text-[var(--kdb-primary)]'
            disabled={isLoading}
            onClick={() => requestOtpForLookup({ applicationNumber })}
          >
            {lang === 'hi' ? 'कोड पुनः भेजें' : 'Resend code'}
          </button>

          <button
            type='button'
            className='text-sm text-[var(--kdb-muted)] underline underline-offset-2'
            onClick={() => {
              setPhase('lookup')
              setError(null)
            }}
          >
            {lang === 'hi' ? 'एक भिन्न आवेदन क्रमांक का उपयोग करें' : 'Use a different application number'}
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className='flex flex-col gap-5'>
          {allotmentPaymentSuccess && (
            <div className='flex gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3' role='status'>
              <CheckCircle2Icon className='mt-0.5 size-5 shrink-0 text-emerald-700' />
              <div className='text-sm'>
                <p className='font-semibold text-emerald-900'>
                  {lang === 'hi' ? 'आबंटन शुल्क भुगतान सफल!' : 'Allotment Fee Payment Successful!'}
                </p>
                <p className='mt-1 text-emerald-800'>
                  {lang === 'hi'
                    ? 'आपका बूथ/स्टॉल सफलतापूर्वक आबंटित हो गया है। आप नीचे अपना आधिकारिक आबंटन पत्र डाउनलोड कर सकते हैं।'
                    : 'Your booth/stall has been successfully allotted. You can download your official Allotment Letter below.'}
                </p>
              </div>
            </div>
          )}

          {/* Allotment Payment Required Alert Card */}
          {effectiveStatus === 'payment_required' && (
            <div className='overflow-hidden rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 to-orange-50 p-5 shadow-sm'>
              <div className='flex items-start gap-3.5'>
                <div className='rounded-full bg-amber-500 p-2 text-white shrink-0'>
                  <StoreIcon className='size-5' />
                </div>
                <div className='flex-1'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h2 className='text-base font-bold text-amber-950'>
                      {lang === 'hi'
                        ? 'बधाई! आपके स्टॉल का चयन हो गया है'
                        : 'Congratulations! Your Stall is Selected'}
                    </h2>
                    <span className='rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-extrabold text-amber-900 border border-amber-300'>
                      {lang === 'hi' ? 'भुगतान आवश्यक' : 'Payment Required'}
                    </span>
                  </div>

                  <p className='mt-1 text-xs text-amber-900/90 leading-relaxed'>
                    {lang === 'hi'
                      ? 'लकी ड्रॉ में आपके बूथ/स्टॉल का चयन हुआ है। अपना आबंटन सुरक्षित व पक्का करने के लिए कृपया अंतिम तिथि से पूर्व आबंटन शुल्क का भुगतान करें।'
                      : 'Your application was selected in the lucky draw. To secure and confirm your stall allotment, please complete the payment before the deadline.'}
                  </p>

                  <div className='mt-3.5 grid grid-cols-2 gap-3 rounded-lg bg-white/80 p-3 text-xs border border-amber-200/70'>
                    {result.stallNumber && (
                      <div>
                        <span className='text-muted-foreground block text-[11px] font-medium'>
                          {lang === 'hi' ? 'आबंटित स्टॉल क्रमांक' : 'Allotted Stall No.'}
                        </span>
                        <span className='font-mono text-sm font-extrabold text-[#0c2847]'>
                          {result.stallNumber}
                        </span>
                      </div>
                    )}

                    {result.allotmentAmountPaise !== null && (
                      <div>
                        <span className='text-muted-foreground block text-[11px] font-medium'>
                          {lang === 'hi' ? 'देय आबंटन शुल्क' : 'Allotment Fee Payable'}
                        </span>
                        <span className='text-sm font-extrabold text-amber-900'>
                          ₹{(Number(result.allotmentAmountPaise) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {result.allotmentPaymentDeadlineAt && (
                      <div className='col-span-2 pt-1 border-t border-amber-100'>
                        <span className='text-amber-800 font-semibold'>
                          {lang === 'hi' ? 'भुगतान की अंतिम तिथि: ' : 'Payment Deadline: '}
                        </span>
                        <span className='text-amber-950 font-bold'>
                          {new Date(result.allotmentPaymentDeadlineAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {allotmentPaymentError && (
                    <div className='mt-3'>
                      <Alert variant='destructive'>
                        <AlertCircleIcon className='size-4' />
                        <AlertDescription>{allotmentPaymentError}</AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className='mt-4'>
                    <Button
                      type='button'
                      onClick={handlePayAllotmentFee}
                      disabled={isPayingAllotment}
                      className='w-full bg-[#0c2847] hover:bg-[#071a2f] text-white font-bold text-sm shadow-md h-10'
                    >
                      {isPayingAllotment ? (
                        <>
                          <Loader2Icon className='size-4 animate-spin mr-2' />
                          {lang === 'hi' ? 'पेमेंट गेटवे खुल रहा है...' : 'Opening Payment Gateway...'}
                        </>
                      ) : (
                        <>
                          <CreditCardIcon className='size-4 mr-2' />
                          {lang === 'hi'
                            ? `आबंटन शुल्क का भुगतान करें (₹${(Number(result.allotmentAmountPaise ?? 0) / 100).toLocaleString('en-IN')})`
                            : `Pay Allotment Fee (₹${(Number(result.allotmentAmountPaise ?? 0) / 100).toLocaleString('en-IN')})`}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Allotted & Confirmed Card */}
          {effectiveStatus === 'allotted' && (
            <div className='overflow-hidden rounded-xl border-2 border-emerald-400 bg-linear-to-br from-emerald-50 to-teal-50 p-5 shadow-sm'>
              <div className='flex items-start gap-3.5'>
                <div className='rounded-full bg-emerald-600 p-2 text-white shrink-0'>
                  <CheckCircle2Icon className='size-5' />
                </div>
                <div className='flex-1'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h2 className='text-base font-bold text-emerald-950'>
                      {lang === 'hi'
                        ? 'बधाई! आपका बूथ/स्टॉल आबंटित हो गया है'
                        : 'Congratulations! Your Stall is Allotted'}
                    </h2>
                    <span className='rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900 border border-emerald-300'>
                      {lang === 'hi' ? 'आबंटित' : 'Allotted'}
                    </span>
                  </div>

                  <p className='mt-1 text-xs text-emerald-900/90 leading-relaxed'>
                    {lang === 'hi'
                      ? 'आपका स्टॉल आबंटन आधिकारिक रूप से पुष्टीकृत हो चुका है। आप अपना आबंटन पत्र यहाँ से डाउनलोड कर सकते हैं।'
                      : 'Your stall allotment is officially confirmed. You can view and download your official Allotment Letter below.'}
                  </p>

                  {result.stallNumber && (
                    <div className='mt-3.5 rounded-lg bg-white/80 p-3 text-xs border border-emerald-200/70 flex items-center justify-between'>
                      <span className='text-muted-foreground font-medium'>
                        {lang === 'hi' ? 'आबंटित स्टॉल क्रमांक:' : 'Allotted Stall Number:'}
                      </span>
                      <span className='font-mono text-base font-extrabold text-[#0c2847]'>
                        {result.stallNumber}
                      </span>
                    </div>
                  )}

                  <div className='mt-4 flex flex-col sm:flex-row gap-2.5'>
                    <Link
                      href={`/allotment-letter?appNo=${encodeURIComponent(applicationNumber)}`}
                      className='flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 shadow-xs transition'
                    >
                      <DownloadIcon className='size-4' />
                      {lang === 'hi' ? 'आबंटन पत्र डाउनलोड करें' : 'Download Allotment Letter'}
                    </Link>
                    <Link
                      href={`/print-application?appNo=${encodeURIComponent(applicationNumber)}`}
                      className='inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700/30 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs py-2.5 px-4 shadow-xs transition'
                    >
                      <FileTextIcon className='size-4 text-emerald-700' />
                      {lang === 'hi' ? 'आवेदन प्रिंट' : 'Print Application'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadedFilename && (
            <div className='flex gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3' role='status'>
              <CheckCircle2Icon className='mt-0.5 size-5 shrink-0 text-emerald-700' />
              <div className='text-sm'>
                <p className='font-semibold text-emerald-900'>
                  {lang === 'hi' ? 'फ़ाइल सफलतापूर्वक अपलोड हो गई' : 'File uploaded successfully'}
                </p>
                <p className='break-all text-emerald-800'>{uploadedFilename}</p>
                <p className='mt-1 text-emerald-800'>
                  {lang === 'hi'
                    ? 'आपका सही किया हुआ दस्तावेज़ जमा हो गया है और समीक्षा के लिए भेज दिया गया है।'
                    : 'Your corrected document has been submitted and sent back for review.'}
                </p>
              </div>
            </div>
          )}

          {uploadMessage && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>{uploadMessage}</AlertDescription>
            </Alert>
          )}

          <div className='overflow-hidden rounded-lg border border-[var(--kdb-border)] bg-white'>
            <div className='border-b border-[var(--kdb-border)] px-5 py-4'>
              <p className='text-xs text-[var(--kdb-muted)]'>{lang === 'hi' ? 'आवेदन क्रमांक' : 'Application No.'}</p>
              <p className='font-mono text-lg font-bold text-[var(--kdb-primary)]'>{applicationNumber}</p>
            </div>
            <dl className='divide-y divide-[var(--kdb-border)] text-sm'>
              <div className='flex items-start justify-between gap-4 px-5 py-3'>
                <dt className='text-[var(--kdb-muted)]'>{lang === 'hi' ? 'श्रेणी' : 'Category'}</dt>
                <dd className='text-right font-medium text-[var(--kdb-text)]'>
                  {lang === 'hi' ? (result.categoryNameHi || result.categoryName) : result.categoryName}
                </dd>
              </div>
              <div className='flex items-start justify-between gap-4 px-5 py-3'>
                <dt className='text-[var(--kdb-muted)]'>{lang === 'hi' ? 'स्थिति' : 'Status'}</dt>
                <dd className='text-right font-semibold text-[var(--kdb-primary)]'>{statusText}</dd>
              </div>
              {result.stallNumber && (
                <div className='flex items-start justify-between gap-4 px-5 py-3 bg-amber-50/50'>
                  <dt className='font-semibold text-amber-900'>{lang === 'hi' ? 'आबंटित स्टॉल क्रमांक' : 'Allotted Stall No.'}</dt>
                  <dd className='text-right font-bold font-mono text-amber-950'>{result.stallNumber}</dd>
                </div>
              )}
              {result.allotmentPaymentEnabled && result.allotmentAmountPaise !== null && (
                <div className='flex items-start justify-between gap-4 px-5 py-3'>
                  <dt className='text-[var(--kdb-muted)]'>{lang === 'hi' ? 'आबंटन शुल्क' : 'Allotment Fee'}</dt>
                  <dd className='text-right font-medium text-[var(--kdb-text)]'>
                    ₹{(Number(result.allotmentAmountPaise) / 100).toLocaleString('en-IN')}
                    {result.allotmentPaymentStatus === 'success' && (
                      <span className='ml-2 inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full'>
                        {lang === 'hi' ? 'भुगतान सफल' : 'Paid'}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {result.submittedAt && (
                <div className='flex items-start justify-between gap-4 px-5 py-3'>
                  <dt className='text-[var(--kdb-muted)]'>{lang === 'hi' ? 'जमा करने की तिथि' : 'Submitted on'}</dt>
                  <dd className='text-right font-medium text-[var(--kdb-text)]'>
                    {formatDate(result.submittedAt, lang)}
                  </dd>
                </div>
              )}
            </dl>
            {hint && (
              <p className='border-t border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] px-5 py-3 text-sm text-[var(--kdb-text)]'>
                {hint}
              </p>
            )}
          </div>

          {result.documents.length > 0 && (
            <div className='rounded-lg border border-[var(--kdb-border)] bg-white'>
              <p className='border-b border-[var(--kdb-border)] px-5 py-3 text-sm font-semibold text-[var(--kdb-primary)]'>
                {lang === 'hi' ? 'दस्तावेज़' : 'Documents'}
              </p>
              <ul className='divide-y divide-[var(--kdb-border)]'>
                {result.documents.map(doc => {
                  const needsResponse = doc.verificationStatus === 'query'

                  const cfg = doc.verificationStatus
                    ? getDocumentStatusConfig(doc.verificationStatus)
                    : { label: '', color: 'bg-gray-100 text-gray-700' }

                  const statusLabel = doc.verificationStatus
                    ? lang === 'hi'
                      ? (DOCUMENT_STATUS_HI[doc.verificationStatus] ?? cfg.label)
                      : cfg.label
                    : lang === 'hi'
                      ? 'अपलोड नहीं हुआ'
                      : 'Not uploaded'

                  return (
                    <li key={doc.documentKey} className='px-5 py-3 text-sm'>
                      <div className='flex items-start justify-between gap-3'>
                        <span className='text-[var(--kdb-text)]'>
                          {lang === 'hi' ? (doc.labelHi || doc.label) : doc.label}
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
                          {statusLabel}
                        </span>
                      </div>

                      {needsResponse && (
                        <div className='mt-2 border-l-2 border-orange-400 pl-3'>
                          {doc.verificationRemarks && (
                            <p className='text-xs text-[var(--kdb-text)]'>
                              <span className='font-semibold'>{lang === 'hi' ? 'टिप्पणी: ' : 'Reviewer note: '}</span>
                              {doc.verificationRemarks}
                            </p>
                          )}
                          <label className='mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--kdb-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90'>
                            {uploadingKey === doc.documentKey ? (
                              <Loader2Icon className='size-3.5 animate-spin' />
                            ) : (
                              <UploadIcon className='size-3.5' />
                            )}
                            {lang === 'hi' ? 'सही फ़ाइल अपलोड करें' : 'Upload corrected file'}
                            <input
                              type='file'
                              className='hidden'
                              accept='.pdf,.jpg,.jpeg,.png'
                              disabled={uploadingKey === doc.documentKey}
                              onChange={e => {
                                const file = e.target.files?.[0]

                                if (file) void respondToQuery(doc.documentKey, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                      )}

                      {reuploadedKeys.includes(doc.documentKey) && !needsResponse && (
                        <p className='mt-1 flex items-center gap-1 text-xs text-emerald-700'>
                          <CheckCircle2Icon className='size-3.5' />
                          {lang === 'hi' ? 'नई फ़ाइल जमा हो गई, समीक्षा लंबित।' : 'New file submitted, awaiting review.'}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Quick links to print and allotment letter */}
          <div className='flex items-center justify-between text-xs text-muted-foreground pt-1 px-1'>
            <Link
              href={`/print-application?appNo=${encodeURIComponent(applicationNumber)}`}
              className='underline hover:text-[var(--kdb-primary)] flex items-center gap-1'
            >
              <FileTextIcon className='size-3.5' />
              {lang === 'hi' ? 'आवेदन पत्र प्रिंट करें' : 'Print Application Form'}
            </Link>
            <Link
              href={`/allotment-letter?appNo=${encodeURIComponent(applicationNumber)}`}
              className='underline hover:text-[var(--kdb-primary)] flex items-center gap-1'
            >
              <DownloadIcon className='size-3.5' />
              {lang === 'hi' ? 'आबंटन पत्र पोर्टल' : 'Allotment Letter Portal'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusLookup
