'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  CreditCardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
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
import { downloadBlob } from '@/lib/browser/download-blob'

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
    en: 'Your booth/stall has been allocated. Please complete the allotment payment to confirm your booking.',
    hi: 'आपके बूथ/स्टॉल का आवंटन निर्धारित किया गया है। पुष्टि के लिए कृपया निर्धारित समय से पूर्व आवंटन शुल्क का भुगतान करें।'
  },
  allotted: {
    en: 'Your booth/stall is confirmed and allotted. You can download your official Allotment Letter below.',
    hi: 'आपका बूथ/स्टॉल सफलतापूर्वक आवंटित और पुष्टीकृत हो गया है। आप नीचे अपना आधिकारिक आवंटन पत्र डाउनलोड कर सकते हैं।'
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

  // Registration (application) fee payment state — for an application still
  // sitting in 'payment_pending' (submitted but the initial fee was never
  // paid, or a previous attempt failed), looked up here the same OTP way as
  // an already-paid application. Reuses the same order/verify API as the
  // apply-flow's own payment page (purpose defaults to 'registration'
  // server-side), just driven inline here instead of redirecting, since this
  // page already has the OTP-verified access token in `result.accessToken`.
  const [isPayingRegistration, setIsPayingRegistration] = useState(false)
  const [registrationPaymentError, setRegistrationPaymentError] = useState<string | null>(null)
  const [registrationPaymentSuccess, setRegistrationPaymentSuccess] = useState(false)

  const [isDownloadingAllotmentLetter, setIsDownloadingAllotmentLetter] = useState(false)
  const [allotmentLetterError, setAllotmentLetterError] = useState<string | null>(null)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '' }
  })

  // Prefills from ?appNo=... when arriving via the homepage's status-check
  // search bar (StatusCheckSection.tsx), a print/receipt page link, or a
  // directly-pasted URL. Depends on `searchParams` (not `[]`) because on a
  // direct hard navigation to this URL, `useSearchParams()` can still return
  // an empty/initial value on the very first client render before the
  // router has resolved the query string — an empty-deps effect runs
  // exactly once and never gets a chance to pick up the value once it
  // becomes available, silently leaving the field blank.
  useEffect(() => {
    const appNo = searchParams.get('appNo')

    if (appNo) {
      form.setValue('applicationNumber', appNo, { shouldDirty: true, shouldTouch: true, shouldValidate: false })
    }
  }, [searchParams, form])

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

  // Registration (application) fee payment via Razorpay — mirrors
  // handlePayAllotmentFee above, but omits `purpose` so the order route
  // takes its default 'registration' branch instead of 'pay_now'.
  const handlePayRegistrationFee = async () => {
    if (!result || !result.applicationId) return

    setIsPayingRegistration(true)
    setRegistrationPaymentError(null)

    try {
      const loaded = await loadRazorpayCheckoutScript()
      if (!loaded) {
        setRegistrationPaymentError(
          lang === 'hi'
            ? 'पेमेंट गेटवे लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।'
            : 'Could not load payment gateway. Please check your internet connection.'
        )
        setIsPayingRegistration(false)
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (result.accessToken) {
        headers['Authorization'] = `Bearer ${result.accessToken}`
      }

      const orderRes = await fetch(`/api/applications/${result.applicationId}/payment/order`, {
        method: 'POST',
        headers
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setRegistrationPaymentError(
          orderData.error ?? (lang === 'hi' ? 'भुगतान शुरू नहीं हो सका।' : 'Could not initiate payment.')
        )
        setIsPayingRegistration(false)
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
            ? `आवेदन शुल्क — ${orderData.applicationNumber}`
            : `Application Fee — ${orderData.applicationNumber}`,
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
              setRegistrationPaymentError(
                verifyData.error ??
                  (lang === 'hi'
                    ? 'भुगतान सत्यापन विफल रहा। यदि राशि कट गई है तो सहायता से संपर्क करें।'
                    : 'Payment verification failed. If amount was deducted, please contact support.')
              )
              setIsPayingRegistration(false)
              return
            }

            setRegistrationPaymentSuccess(true)
            setResult(prev => (prev ? { ...prev, status: 'under_review' } : null))
            setIsPayingRegistration(false)
          } catch {
            setRegistrationPaymentError(
              lang === 'hi'
                ? 'सत्यापन के दौरान त्रुटि हुई। कृपया सहायता से संपर्क करें।'
                : 'Error verifying payment. Please contact support.'
            )
            setIsPayingRegistration(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingRegistration(false)
          }
        }
      })

      razorpay.open()
    } catch {
      setRegistrationPaymentError(
        lang === 'hi' ? 'भुगतान शुरू करने में समस्या आई।' : 'An error occurred while starting payment.'
      )
      setIsPayingRegistration(false)
    }
  }

  // Downloads the official allotment letter PDF directly — same data/HTML
  // template as the admin panel's download (src/lib/allotment/allotment-letter-pdf.ts),
  // so applicant and admin always see identical content, always in English.
  const downloadAllotmentLetter = async () => {
    if (!result) return

    setAllotmentLetterError(null)
    setIsDownloadingAllotmentLetter(true)

    try {
      const headers: Record<string, string> = {}
      if (result.accessToken) {
        headers['Authorization'] = `Bearer ${result.accessToken}`
      }

      const response = await fetch(`/api/applications/${result.applicationId}/allotment-letter/pdf?lang=en`, { headers })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setAllotmentLetterError(
          body.error ?? (lang === 'hi' ? 'आवंटन पत्र डाउनलोड नहीं हो सका।' : 'Could not download the allotment letter.')
        )

        return
      }

      downloadBlob(await response.blob(), `Allotment-Letter-${applicationNumber}.pdf`)
    } catch {
      setAllotmentLetterError(
        lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsDownloadingAllotmentLetter(false)
    }
  }

  // Once the last open query is answered the server moves the application
  // back to Under Review; mirror that locally since re-fetching needs a new OTP.
  const hasOpenQuery = result?.documents.some(doc => doc.verificationStatus === 'query') ?? false

  const effectiveStatus =
    result && result.status === 'query_raised' && !hasOpenQuery ? 'under_review' : (result?.status ?? '')

  const statusText = STATUS_LABEL[effectiveStatus]?.[lang === 'hi' ? 'hi' : 'en'] ?? effectiveStatus
  const hint = STATUS_HINT[effectiveStatus]?.[lang === 'hi' ? 'hi' : 'en']

  const isResult = phase === 'result' && !!result

  return (
    <div
      className={`mx-auto px-4 py-8 sm:px-6 lg:px-8 transition-all duration-200 ${
        isResult ? 'max-w-6xl' : 'max-w-xl py-12'
      }`}
    >
      {/* Page Header */}
      {!isResult ? (
        <div className='mb-8 text-center sm:text-left'>
          <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)] tracking-tight'>
            {phase === 'otp'
              ? lang === 'hi'
                ? 'सत्यापन कोड (OTP) दर्ज करें'
                : 'Enter Verification Code'
              : lang === 'hi'
                ? 'अपने स्टॉल/बूथ आवेदन फॉर्म की स्थिति जांचें'
                : 'Check Your Stall/Booth Application Status'}
          </h1>
          <p className='text-sm text-[var(--kdb-muted)] leading-relaxed'>
            {phase === 'otp'
              ? lang === 'hi'
                ? `आपके पंजीकृत मोबाइल/व्हाट्सएप नंबर (...${(maskedMobile || '').slice(-4)}) पर भेजा गया 6-अंकों का सत्यापन कोड दर्ज करें।`
              : `Enter the 6-digit verification code sent to your registered WhatsApp number ending ${(maskedMobile || '').slice(-4)}.`
              : lang === 'hi'
                ? 'गीता जयंती महोत्सव 2026 के लिए अपने स्टॉल/बूथ के आवेदन फॉर्म की नवीनतम स्थिति देखने के लिए अपना आवेदन क्रमांक दर्ज करें। हम आपके पंजीकृत मोबाइल नंबर पर एक सत्यापन कोड भेजेंगे।'
                : "Enter your application number to check the latest status of your application for Gita Jayanti Mahotsav 2026. We'll send a verification code to your registered mobile number."}
          </p>
        </div>
      ) : (
        <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-900 border border-amber-200 mb-2'>
              <span>अंतर्राष्ट्रीय गीता महोत्सव 2026</span>
              <span>•</span>
              <span>कुरुक्षेत्र विकास बोर्ड (KDB)</span>
            </div>
            <h1 className='text-2xl sm:text-3xl font-extrabold text-[#0c2847] tracking-tight'>
              {lang === 'hi' ? 'आवेदन स्थिति एवं आवंटन विवरण' : 'Application Status & Allotment Details'}
            </h1>
            <p className='text-xs sm:text-sm text-slate-500 mt-1'>
              {lang === 'hi'
                ? `आवेदन क्रमांक: ${applicationNumber} | नवीनतम अद्यतन स्थिति`
                : `Application No: ${applicationNumber} | Latest Status`}
            </p>
          </div>
          <div className='flex items-center gap-2.5 self-start sm:self-auto'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setPhase('lookup')
                setError(null)
              }}
              className='h-9 text-xs font-semibold'
            >
              <ArrowLeftIcon className='size-3.5 mr-1.5' />
              {lang === 'hi' ? 'अन्य आवेदन जांचें' : 'Check Another Application'}
            </Button>
            <Link
              href={`/print-application?appNo=${encodeURIComponent(applicationNumber)}`}
              target='_blank'
              className='inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition'
            >
              <FileTextIcon className='size-3.5 text-slate-600' />
              {lang === 'hi' ? 'आवेदन प्रिंट' : 'Print Form'}
            </Link>
          </div>
        </div>
      )}

      {/* Lookup Phase */}
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

          <Button type='submit' disabled={isLoading} className='h-11 font-semibold'>
            {isLoading ? <Loader2Icon className='animate-spin' /> : <SearchIcon />}
            {lang === 'hi' ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}
          </Button>
        </form>
      )}

      {/* OTP Phase */}
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

          <Button
            type='button'
            disabled={isLoading || otpCode.length !== 6}
            onClick={verifyOtpAndFetchStatus}
            className='h-11 font-semibold'
          >
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

      {/* Result Phase */}
      {phase === 'result' && result && (
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {/* Main / Primary Column */}
          <div className='lg:col-span-7 xl:col-span-8 flex flex-col gap-5'>
            {allotmentPaymentSuccess && (
              <div className='flex gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 shadow-2xs' role='status'>
                <CheckCircle2Icon className='mt-0.5 size-5 shrink-0 text-emerald-700' />
                <div className='text-sm'>
                  <p className='font-bold text-emerald-900'>
                    {lang === 'hi' ? 'आवंटन शुल्क भुगतान सफल!' : 'Allotment Fee Payment Successful!'}
                  </p>
                  <p className='mt-1 text-emerald-800 text-xs sm:text-sm leading-relaxed'>
                    {lang === 'hi'
                      ? 'आपका बूथ/स्टॉल सफलतापूर्वक आवंटित हो गया है। आप नीचे दिए गए बटन से अपना आधिकारिक आवंटन पत्र डाउनलोड कर सकते हैं।'
                      : 'Your booth/stall has been successfully allotted. You can download your official Allotment Letter below.'}
                  </p>
                </div>
              </div>
            )}

            {registrationPaymentSuccess && (
              <div className='flex gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 shadow-2xs' role='status'>
                <CheckCircle2Icon className='mt-0.5 size-5 shrink-0 text-emerald-700' />
                <div className='text-sm'>
                  <p className='font-bold text-emerald-900'>
                    {lang === 'hi' ? 'आवेदन शुल्क भुगतान सफल!' : 'Application Fee Payment Successful!'}
                  </p>
                  <p className='mt-1 text-emerald-800 text-xs sm:text-sm leading-relaxed'>
                    {lang === 'hi'
                      ? 'आपका आवेदन अब समीक्षा के लिए भेज दिया गया है।'
                      : 'Your application has now been sent for review.'}
                  </p>
                </div>
              </div>
            )}

            {/* Registration Fee Payment Pending Alert Card */}
            {effectiveStatus === 'payment_pending' && !registrationPaymentSuccess && (
              <div className='overflow-hidden rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 via-orange-50/70 to-amber-50 p-5 sm:p-6 shadow-sm'>
                <div className='flex items-start gap-4'>
                  <div className='rounded-xl bg-amber-500 p-2.5 text-white shrink-0 shadow-xs'>
                    <CreditCardIcon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h2 className='text-lg font-bold text-amber-950'>
                        {lang === 'hi' ? 'आवेदन शुल्क भुगतान लंबित' : 'Application Fee Payment Pending'}
                      </h2>
                      <span className='rounded-full bg-amber-200/90 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-300 shadow-2xs'>
                        {lang === 'hi' ? 'भुगतान लंबित' : 'Payment Pending'}
                      </span>
                    </div>

                    <p className='mt-2 text-xs sm:text-sm text-amber-900/95 leading-relaxed'>
                      {lang === 'hi'
                        ? 'आपका आवेदन जमा हो चुका है, लेकिन आवेदन शुल्क का भुगतान अभी पूरा नहीं हुआ है। समीक्षा शुरू होने के लिए कृपया नीचे भुगतान पूरा करें।'
                        : 'Your application has been submitted, but the application fee payment is not complete yet. Please complete the payment below so your application can be reviewed.'}
                    </p>

                    {result.feePaise !== null && (
                      <div className='mt-4 rounded-lg bg-white/90 p-3.5 text-sm border border-amber-200/80 flex items-center justify-between shadow-2xs'>
                        <span className='text-slate-500 font-medium text-xs'>
                          {lang === 'hi' ? 'देय आवेदन शुल्क' : 'Application Fee Payable'}
                        </span>
                        <span className='text-base font-extrabold text-amber-950'>
                          ₹{(Number(result.feePaise) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    {registrationPaymentError && (
                      <div className='mt-3'>
                        <Alert variant='destructive'>
                          <AlertCircleIcon className='size-4' />
                          <AlertDescription>{registrationPaymentError}</AlertDescription>
                        </Alert>
                      </div>
                    )}

                    <div className='mt-4'>
                      <Button
                        type='button'
                        onClick={handlePayRegistrationFee}
                        disabled={isPayingRegistration}
                        className='w-full bg-[#0c2847] hover:bg-[#071a2f] text-white font-bold text-sm shadow-md h-11'
                      >
                        {isPayingRegistration ? (
                          <>
                            <Loader2Icon className='size-4 animate-spin mr-2' />
                            {lang === 'hi' ? 'पेमेंट गेटवे खुल रहा है...' : 'Opening Payment Gateway...'}
                          </>
                        ) : (
                          <>
                            <CreditCardIcon className='size-4 mr-2' />
                            {lang === 'hi'
                              ? `आवेदन शुल्क का भुगतान करें${result.feePaise !== null ? ` (₹${(Number(result.feePaise) / 100).toLocaleString('en-IN')})` : ''}`
                              : `Pay Application Fee${result.feePaise !== null ? ` (₹${(Number(result.feePaise) / 100).toLocaleString('en-IN')})` : ''}`}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Allotment Payment Required Alert Card */}
            {effectiveStatus === 'payment_required' && (
              <div className='overflow-hidden rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 via-orange-50/70 to-amber-50 p-5 sm:p-6 shadow-sm'>
                <div className='flex items-start gap-4'>
                  <div className='rounded-xl bg-amber-500 p-2.5 text-white shrink-0 shadow-xs'>
                    <StoreIcon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h2 className='text-lg font-bold text-amber-950'>
                        {lang === 'hi'
                          ? 'आवंटन सूचना: आवंटन शुल्क भुगतान आवश्यक'
                          : 'Allotment Notice: Allotment Fee Payment Required'}
                      </h2>
                      <span className='rounded-full bg-amber-200/90 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-300 shadow-2xs'>
                        {lang === 'hi' ? 'भुगतान आवश्यक' : 'Payment Required'}
                      </span>
                    </div>

                    <p className='mt-2 text-xs sm:text-sm text-amber-900/95 leading-relaxed'>
                      {lang === 'hi'
                        ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026 के अंतर्गत आपके स्टॉल/बूथ का आवंटन निर्धारित किया गया है। अपना आवंटन पुष्टीकृत करने हेतु कृपया निर्धारित अंतिम तिथि से पूर्व आवंटन शुल्क का भुगतान करें।'
                        : 'Your booth/stall has been allocated for International Gita Mahotsav 2026. To secure and confirm your stall allotment, please complete the payment of the allotment fee before the deadline.'}
                    </p>

                    <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-white/90 p-3.5 text-xs border border-amber-200/80 shadow-2xs'>
                      {result.stallNumber && (
                        <div>
                          <span className='text-slate-500 block text-[11px] font-semibold uppercase tracking-wider'>
                            {lang === 'hi' ? 'आवंटित स्टॉल क्रमांक' : 'Allotted Stall No.'}
                          </span>
                          <span className='font-mono text-base font-extrabold text-[#0c2847]'>
                            {result.stallNumber}
                          </span>
                        </div>
                      )}

                      {result.allotmentAmountPaise !== null && (
                        <div>
                          <span className='text-slate-500 block text-[11px] font-semibold uppercase tracking-wider'>
                            {lang === 'hi' ? 'देय आवंटन शुल्क' : 'Allotment Fee Payable'}
                          </span>
                          <span className='text-base font-extrabold text-amber-950'>
                            ₹{(Number(result.allotmentAmountPaise) / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {result.allotmentPaymentDeadlineAt && (
                        <div className='col-span-1 sm:col-span-2 pt-2 border-t border-amber-100 flex items-center justify-between flex-wrap gap-2'>
                          <span className='text-amber-800 font-semibold text-xs flex items-center gap-1.5'>
                            <ClockIcon className='size-3.5 text-amber-700' />
                            {lang === 'hi' ? 'भुगतान की अंतिम तिथि:' : 'Payment Deadline:'}
                          </span>
                          <span className='text-amber-950 font-bold text-xs bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200'>
                            {new Date(result.allotmentPaymentDeadlineAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
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
                        className='w-full bg-[#0c2847] hover:bg-[#071a2f] text-white font-bold text-sm shadow-md h-11'
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
                              ? `आवंटन शुल्क का भुगतान करें (₹${(Number(result.allotmentAmountPaise ?? 0) / 100).toLocaleString('en-IN')})`
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
              <div className='overflow-hidden rounded-xl border-2 border-emerald-400 bg-linear-to-br from-emerald-50 via-teal-50/60 to-emerald-50 p-5 sm:p-6 shadow-sm'>
                <div className='flex items-start gap-4'>
                  <div className='rounded-xl bg-emerald-600 p-2.5 text-white shrink-0 shadow-xs'>
                    <CheckCircle2Icon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h2 className='text-lg font-bold text-emerald-950'>
                        {lang === 'hi'
                          ? 'बधाई! आपका स्टॉल आवंटन पुष्टीकृत हो चुका है'
                          : 'Congratulations! Your Stall Allotment is Confirmed'}
                      </h2>
                      <span className='rounded-full bg-emerald-200/90 px-3 py-1 text-xs font-extrabold text-emerald-900 border border-emerald-300 shadow-2xs'>
                        {lang === 'hi' ? 'आवंटित' : 'Allotted'}
                      </span>
                    </div>

                    <p className='mt-2 text-xs sm:text-sm text-emerald-900/95 leading-relaxed'>
                      {lang === 'hi'
                        ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026 हेतु आपका स्टॉल आधिकारिक रूप से आवंटित व पुष्टीकृत कर दिया गया है। आप नीचे दिए गए बटन से अपना आधिकारिक आवंटन पत्र डाउनलोड कर सकते हैं।'
                        : 'Your stall allotment for International Gita Mahotsav 2026 is officially confirmed. You can view and download your official Allotment Letter below.'}
                    </p>

                    {result.stallNumber && (
                      <div className='mt-4 rounded-lg bg-white/90 p-3.5 text-sm border border-emerald-200/80 flex items-center justify-between shadow-2xs'>
                        <span className='text-slate-500 font-medium text-xs'>
                          {lang === 'hi' ? 'आवंटित स्टॉल क्रमांक:' : 'Allotted Stall Number:'}
                        </span>
                        <span className='font-mono text-base sm:text-lg font-extrabold text-[#0c2847] bg-emerald-100/70 px-3 py-1 rounded-md border border-emerald-300/60'>
                          {result.stallNumber}
                        </span>
                      </div>
                    )}

                    <div className='mt-4 flex flex-col sm:flex-row gap-2.5'>
                      <button
                        type='button'
                        onClick={downloadAllotmentLetter}
                        disabled={isDownloadingAllotmentLetter}
                        className='flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-xs transition disabled:opacity-60'
                      >
                        {isDownloadingAllotmentLetter ? (
                          <Loader2Icon className='size-4 animate-spin' />
                        ) : (
                          <DownloadIcon className='size-4' />
                        )}
                        {lang === 'hi' ? 'आवंटन पत्र डाउनलोड करें' : 'Download Allotment Letter'}
                      </button>
                      <Link
                        href={`/print-application?appNo=${encodeURIComponent(applicationNumber)}`}
                        className='inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700/30 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs sm:text-sm py-2.5 px-4 shadow-xs transition'
                      >
                        <FileTextIcon className='size-4 text-emerald-700' />
                        {lang === 'hi' ? 'आवेदन प्रिंट' : 'Print Application'}
                      </Link>
                    </div>
                    {allotmentLetterError && (
                      <p className='mt-2 text-xs font-semibold text-red-700'>{allotmentLetterError}</p>
                    )}
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

            {/* Application Details Card */}
            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs'>
              <div className='border-b border-slate-200 px-5 py-4 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                    {lang === 'hi' ? 'आवेदन विवरण' : 'Application Details'}
                  </p>
                  <p className='font-mono text-lg font-bold text-[#0c2847]'>{applicationNumber}</p>
                </div>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200'>
                  {statusText}
                </span>
              </div>
              <dl className='divide-y divide-slate-100 text-sm'>
                <div className='flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/40 transition-colors'>
                  <dt className='text-slate-500 text-xs font-medium uppercase tracking-wider'>
                    {lang === 'hi' ? 'श्रेणी' : 'Category'}
                  </dt>
                  <dd className='text-right font-medium text-slate-900'>
                    {lang === 'hi' ? (result.categoryNameHi || result.categoryName) : result.categoryName}
                  </dd>
                </div>
                <div className='flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/40 transition-colors'>
                  <dt className='text-slate-500 text-xs font-medium uppercase tracking-wider'>
                    {lang === 'hi' ? 'स्थिति' : 'Status'}
                  </dt>
                  <dd className='text-right font-semibold text-[var(--kdb-primary)]'>{statusText}</dd>
                </div>
                {result.stallNumber && (
                  <div className='flex items-start justify-between gap-4 px-5 py-3.5 bg-amber-50/60'>
                    <dt className='font-semibold text-amber-900 text-xs uppercase tracking-wider'>
                      {lang === 'hi' ? 'आवंटित स्टॉल क्रमांक' : 'Allotted Stall No.'}
                    </dt>
                    <dd className='text-right font-bold font-mono text-amber-950 text-base'>{result.stallNumber}</dd>
                  </div>
                )}
                {result.allotmentPaymentEnabled && result.allotmentAmountPaise !== null && (
                  <div className='flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/40 transition-colors'>
                    <dt className='text-slate-500 text-xs font-medium uppercase tracking-wider'>
                      {lang === 'hi' ? 'आवंटन शुल्क' : 'Allotment Fee'}
                    </dt>
                    <dd className='text-right font-medium text-slate-900'>
                      ₹{(Number(result.allotmentAmountPaise) / 100).toLocaleString('en-IN')}
                      {result.allotmentPaymentStatus === 'success' && (
                        <span className='ml-2 inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full'>
                          {lang === 'hi' ? 'भुगतान सफल' : 'Paid'}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {result.submittedAt && (
                  <div className='flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-slate-50/40 transition-colors'>
                    <dt className='text-slate-500 text-xs font-medium uppercase tracking-wider'>
                      {lang === 'hi' ? 'जमा करने की तिथि' : 'Submitted on'}
                    </dt>
                    <dd className='text-right font-medium text-slate-900'>
                      {formatDate(result.submittedAt, lang)}
                    </dd>
                  </div>
                )}
              </dl>
              {hint && (
                <div className='border-t border-slate-200 bg-blue-50/40 px-5 py-3 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5'>
                  <InfoIcon className='size-4 text-blue-600 shrink-0 mt-0.5' />
                  <span>{hint}</span>
                </div>
              )}
            </div>
          </div>

          {/* Side / Secondary Column */}
          <div className='lg:col-span-5 xl:col-span-4 flex flex-col gap-5'>
            {/* Quick Actions Card */}
            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs'>
              <h3 className='text-sm font-bold text-[#0c2847] uppercase tracking-wider mb-3'>
                {lang === 'hi' ? 'त्वरित सेवाएं' : 'Quick Services'}
              </h3>
              <div className='flex flex-col gap-2'>
                <Link
                  href={`/print-application?appNo=${encodeURIComponent(applicationNumber)}`}
                  className='flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition'
                >
                  <span className='flex items-center gap-2'>
                    <FileTextIcon className='size-4 text-[#0c2847]' />
                    {lang === 'hi' ? 'आवेदन पत्र प्रिंट करें' : 'Print Application Form'}
                  </span>
                  <ExternalLinkIcon className='size-3.5 text-slate-400' />
                </Link>

                {effectiveStatus === 'allotted' && (
                  <button
                    type='button'
                    onClick={downloadAllotmentLetter}
                    disabled={isDownloadingAllotmentLetter}
                    className='flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 hover:bg-emerald-50 text-xs font-semibold text-emerald-950 transition disabled:opacity-60'
                  >
                    <span className='flex items-center gap-2'>
                      {isDownloadingAllotmentLetter ? (
                        <Loader2Icon className='size-4 animate-spin text-emerald-700' />
                      ) : (
                        <DownloadIcon className='size-4 text-emerald-700' />
                      )}
                      {lang === 'hi' ? 'आवंटन पत्र डाउनलोड करें' : 'Download Allotment Letter'}
                    </span>
                  </button>
                )}

                <Link
                  href='/guidelines'
                  className='flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition'
                >
                  <span className='flex items-center gap-2'>
                    <InfoIcon className='size-4 text-slate-600' />
                    {lang === 'hi' ? 'नियम एवं दिशानिर्देश' : 'Rules & Guidelines'}
                  </span>
                  <ExternalLinkIcon className='size-3.5 text-slate-400' />
                </Link>
              </div>
            </div>

            {/* Documents Verification Status Card */}
            {result.documents.length > 0 && (
              <div className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs'>
                <div className='border-b border-slate-200 px-5 py-3.5 bg-slate-50/60'>
                  <p className='text-xs font-bold text-[#0c2847] uppercase tracking-wider'>
                    {lang === 'hi' ? 'संलग्न दस्तावेज़ स्थिति' : 'Attached Documents Status'}
                  </p>
                </div>
                <ul className='divide-y divide-slate-100'>
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
                      <li key={doc.documentKey} className='px-5 py-3.5 text-xs sm:text-sm'>
                        <div className='flex items-start justify-between gap-3'>
                          <span className='font-medium text-slate-800'>
                            {lang === 'hi' ? (doc.labelHi || doc.label) : doc.label}
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.color}`}>
                            {statusLabel}
                          </span>
                        </div>

                        {needsResponse && (
                          <div className='mt-2.5 rounded-lg border-l-4 border-amber-500 bg-amber-50/60 p-2.5'>
                            {doc.verificationRemarks && (
                              <p className='text-xs text-amber-950 mb-2'>
                                <span className='font-bold'>{lang === 'hi' ? 'समीक्षक टिप्पणी: ' : 'Reviewer note: '}</span>
                                {doc.verificationRemarks}
                              </p>
                            )}
                            <label className='inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#0c2847] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#071a2f] shadow-2xs transition'>
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
                          <p className='mt-1.5 flex items-center gap-1 text-xs text-emerald-700 font-medium'>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusLookup
