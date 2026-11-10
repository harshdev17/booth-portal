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
import DocumentsStep, { type DocumentUploadState } from '@/views/public/apply/DocumentsStep'
import type { CategoryDocumentDto } from '@/views/public/apply/types'
import { clearStatusSession, readStatusSession, storeStatusSession } from '@/views/public/status/status-session'

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
  documentId: number | null
  documentKey: string
  label: string
  labelHi: string | null
  isRequired: number
  allowedMimeTypes: string
  maxSizeBytes: number
  verificationStatus: string | null
  verificationRemarks: string | null
  originalFilename: string | null
}

type QueryHistoryEntry = { documentLabel: string | null; remarks: string; createdAt: string }

type StatusResult = {
  applicationId: number
  accessToken?: string
  status: string
  applicationQueryRemarks?: string | null
  queryHistory?: QueryHistoryEntry[]
  stallNumber: string | null
  allotmentPaymentEnabled: boolean
  allotmentAmountPaise: number | null
  allotmentPaymentDeadlineAt: string | null
  allotmentPaymentStatus: string | null
  allotmentPaidAt: string | null
  auctionParticipationFeePaise: number | null
  auctionFinalAmountPaise: number | null
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
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आबंटित' },

  // Auction Payment Flow (migration 0077) — Refreshment-category draw
  // winners go through these 3 intermediate states instead of the usual
  // payment_required -> allotted path.
  selected_for_auction: { en: 'Selected for Auction', hi: 'नीलामी हेतु चयनित' },
  auction_fee_paid: { en: 'Auction Fee Paid', hi: 'नीलामी शुल्क भुगतान हो गया' },
  auction_won: { en: 'Auction Won — Payment Pending', hi: 'नीलामी जीती — भुगतान लंबित' }
}

const DOCUMENT_STATUS_HI: Record<string, string> = {
  pending: 'जमा किया गया (समीक्षाधीन)',
  verified: 'सत्यापित',
  rejected: 'अस्वीकृत',
  query: 'स्पष्टीकरण आवश्यक'
}

// Public-facing override for the English "pending" label only — a document
// sits at verification_status='pending' in the DB from the moment it's
// uploaded until an admin reviews it, so showing it as plain "Pending" here
// reads as if the applicant still needs to act, even though the upload is
// already done and nothing is outstanding. Admin-side views keep the shared
// getDocumentStatusConfig() "Pending" label as-is — that one really is a
// to-do item for the reviewing admin.
const DOCUMENT_STATUS_LABEL_EN: Record<string, string> = {
  pending: 'Submitted (Under Review)'
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
  },
  selected_for_auction: {
    en: 'You have been selected in the draw for the physical auction. Please pay the auction participation fee below.',
    hi: 'आपका चयन भौतिक नीलामी (Physical Auction) हेतु ड्रा में हुआ है। कृपया नीचे नीलामी भागीदारी शुल्क का भुगतान करें।'
  },
  auction_fee_paid: {
    en: 'Your auction participation fee is received. You will be invited to the physical auction by Kurukshetra Development Board (KDB).',
    hi: 'आपका नीलामी भागीदारी शुल्क प्राप्त हो गया है। आपको कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा भौतिक नीलामी हेतु आमंत्रित किया जाएगा।'
  },
  auction_won: {
    en: 'Congratulations! You won a booth/stall at the physical auction. Please complete your final auction payment below to confirm your allotment.',
    hi: 'बधाई हो! आपने भौतिक नीलामी में बूथ/स्टॉल जीता है। आवंटन की पुष्टि हेतु कृपया नीचे अपना अंतिम नीलामी भुगतान पूर्ण करें।'
  }
}

type Phase = 'lookup' | 'otp' | 'result'

const StatusLookup = () => {
  const { lang } = useLanguage()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('lookup')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otpWhatsappEnabled, setOtpWhatsappEnabled] = useState(true)
  const [otpCode, setOtpCode] = useState('')
  const [result, setResult] = useState<StatusResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null)
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})

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

  // Auction Payment Flow (migration 0077) — two separate payments for a
  // 'selected_for_auction' / 'auction_won' applicant (Refreshment category):
  // the fixed participation fee first, then the physical-auction's variable
  // final amount. Mirrors handlePayAllotmentFee's state shape exactly.
  const [isPayingAuctionFee, setIsPayingAuctionFee] = useState(false)
  const [auctionFeePaymentError, setAuctionFeePaymentError] = useState<string | null>(null)
  const [auctionFeePaymentSuccess, setAuctionFeePaymentSuccess] = useState(false)

  const [isPayingAuctionFinal, setIsPayingAuctionFinal] = useState(false)
  const [auctionFinalPaymentError, setAuctionFinalPaymentError] = useState<string | null>(null)
  const [auctionFinalPaymentSuccess, setAuctionFinalPaymentSuccess] = useState(false)

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

  // Restores the verified result on a refresh, for up to 5 minutes after
  // the last successful OTP verify — see status-session.ts's doc comment
  // for why this is time-boxed and why it's a UX convenience, not a new
  // security boundary (GET /api/applications/[id]/status independently
  // re-verifies the token server-side on every call). Runs once on mount;
  // an invalid/expired/missing session just leaves the page on its default
  // 'lookup' phase, same as before this existed.
  useEffect(() => {
    const session = readStatusSession()

    if (!session) return

    let cancelled = false

    ;(async () => {
      try {
        const response = await fetch(`/api/applications/${session.applicationId}/status`, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        })

        if (cancelled) return

        if (!response.ok) {
          clearStatusSession()

          return
        }

        const body = await response.json()

        setApplicationNumber(session.applicationNumber)
        setResult(body)
        setPhase('result')
      } catch {
        // Network failure on restore — leave the page on 'lookup' rather
        // than showing an error for what's just a convenience feature.
      }
    })()

    return () => {
      cancelled = true
    }
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
        setOtpWhatsappEnabled(body.whatsappEnabled !== false)
        setOtpCode('')
        setPhase('otp')
      } else {
        setApplicationNumber(values.applicationNumber)
        setResult(body)
        setPhase('result')

        if (body.accessToken) {
          storeStatusSession(body.applicationId, body.accessToken, values.applicationNumber)
        }
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

      if (body.accessToken) {
        storeStatusSession(body.applicationId, body.accessToken, applicationNumber)
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

  const respondToQuery = async (documentKey: string, file: File) => {
    if (!result) return

    // DocumentsStep's own client-side max-size check attaches this instead
    // of calling the server (see DocumentsStep.tsx's handleFileSelect) —
    // mirrors ApplicationFormOrchestrator.tsx's handleUpload handling of
    // the same case for the apply form.
    if ('__clientError' in file && typeof (file as unknown as { __clientError?: string }).__clientError === 'string') {
      setUploadErrors(prev => ({ ...prev, [documentKey]: (file as unknown as { __clientError: string }).__clientError }))

      return
    }

    setUploadMessage(null)
    setUploadedFilename(null)
    setUploadErrors(prev => {
      if (!(documentKey in prev)) return prev

      const next = { ...prev }
      delete next[documentKey]

      return next
    })
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
        const message = body.error ?? (lang === 'hi' ? 'दस्तावेज़ अपलोड विफल रहा।' : 'Upload failed.')

        setUploadMessage(message)
        setUploadErrors(prev => ({ ...prev, [documentKey]: message }))

        return
      }

      setUploadedFilename(file.name)

      setResult(prev => {
        if (!prev) return null

        return {
          ...prev,
          documents: prev.documents.map(d =>
            d.documentKey === documentKey
              ? {
                  ...d,
                  documentId: body.documentId ?? d.documentId,
                  verificationStatus: 'pending',
                  verificationRemarks: null,
                  originalFilename: file.name
                }
              : d
          )
        }
      })
    } catch {
      const message =
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Could not reach the server. Please try again.'

      setUploadMessage(message)
      setUploadErrors(prev => ({ ...prev, [documentKey]: message }))
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

  // Auction participation fee payment via Razorpay (migration 0077's
  // Auction Payment Flow) — mirrors handlePayAllotmentFee above exactly,
  // just targeting purpose: 'auction_fee' and the 'auction_fee_paid' result
  // status instead of 'pay_now'/'allotted'.
  const handlePayAuctionFee = async () => {
    if (!result || !result.applicationId) return

    setIsPayingAuctionFee(true)
    setAuctionFeePaymentError(null)

    try {
      const loaded = await loadRazorpayCheckoutScript()
      if (!loaded) {
        setAuctionFeePaymentError(
          lang === 'hi'
            ? 'पेमेंट गेटवे लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।'
            : 'Could not load payment gateway. Please check your internet connection.'
        )
        setIsPayingAuctionFee(false)
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (result.accessToken) {
        headers['Authorization'] = `Bearer ${result.accessToken}`
      }

      const orderRes = await fetch(`/api/applications/${result.applicationId}/payment/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purpose: 'auction_fee' })
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setAuctionFeePaymentError(
          orderData.error ??
            (lang === 'hi' ? 'भुगतान शुरू नहीं हो सका।' : 'Could not initiate payment.')
        )
        setIsPayingAuctionFee(false)
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
            ? `नीलामी भागीदारी शुल्क — ${orderData.applicationNumber}`
            : `Auction Participation Fee — ${orderData.applicationNumber}`,
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
              setAuctionFeePaymentError(
                verifyData.error ??
                  (lang === 'hi'
                    ? 'भुगतान सत्यापन विफल रहा। यदि राशि कट गई है तो सहायता से संपर्क करें।'
                    : 'Payment verification failed. If amount was deducted, please contact support.')
              )
              setIsPayingAuctionFee(false)
              return
            }

            setAuctionFeePaymentSuccess(true)
            setResult(prev => (prev ? { ...prev, status: 'auction_fee_paid' } : null))
            setIsPayingAuctionFee(false)
          } catch {
            setAuctionFeePaymentError(
              lang === 'hi'
                ? 'सत्यापन के दौरान त्रुटि हुई। कृपया सहायता से संपर्क करें।'
                : 'Error verifying payment. Please contact support.'
            )
            setIsPayingAuctionFee(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingAuctionFee(false)
          }
        }
      })

      razorpay.open()
    } catch {
      setAuctionFeePaymentError(
        lang === 'hi'
          ? 'भुगतान शुरू करने में समस्या आई।'
          : 'An error occurred while starting payment.'
      )
      setIsPayingAuctionFee(false)
    }
  }

  // Final auction payment via Razorpay (migration 0077's Auction Payment
  // Flow) — mirrors handlePayAuctionFee above, targeting purpose:
  // 'auction_final' and the 'allotted' end-state status (this is the last
  // payment in the auction flow — reaching 'allotted' unlocks the Allotment
  // Letter, same as every other allotment path).
  const handlePayAuctionFinal = async () => {
    if (!result || !result.applicationId) return

    setIsPayingAuctionFinal(true)
    setAuctionFinalPaymentError(null)

    try {
      const loaded = await loadRazorpayCheckoutScript()
      if (!loaded) {
        setAuctionFinalPaymentError(
          lang === 'hi'
            ? 'पेमेंट गेटवे लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें।'
            : 'Could not load payment gateway. Please check your internet connection.'
        )
        setIsPayingAuctionFinal(false)
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (result.accessToken) {
        headers['Authorization'] = `Bearer ${result.accessToken}`
      }

      const orderRes = await fetch(`/api/applications/${result.applicationId}/payment/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ purpose: 'auction_final' })
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok) {
        setAuctionFinalPaymentError(
          orderData.error ??
            (lang === 'hi' ? 'भुगतान शुरू नहीं हो सका।' : 'Could not initiate payment.')
        )
        setIsPayingAuctionFinal(false)
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
            ? `अंतिम नीलामी भुगतान — ${orderData.applicationNumber}`
            : `Final Auction Payment — ${orderData.applicationNumber}`,
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
              setAuctionFinalPaymentError(
                verifyData.error ??
                  (lang === 'hi'
                    ? 'भुगतान सत्यापन विफल रहा। यदि राशि कट गई है तो सहायता से संपर्क करें।'
                    : 'Payment verification failed. If amount was deducted, please contact support.')
              )
              setIsPayingAuctionFinal(false)
              return
            }

            setAuctionFinalPaymentSuccess(true)
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
            setIsPayingAuctionFinal(false)
          } catch {
            setAuctionFinalPaymentError(
              lang === 'hi'
                ? 'सत्यापन के दौरान त्रुटि हुई। कृपया सहायता से संपर्क करें।'
                : 'Error verifying payment. Please contact support.'
            )
            setIsPayingAuctionFinal(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingAuctionFinal(false)
          }
        }
      })

      razorpay.open()
    } catch {
      setAuctionFinalPaymentError(
        lang === 'hi'
          ? 'भुगतान शुरू करने में समस्या आई।'
          : 'An error occurred while starting payment.'
      )
      setIsPayingAuctionFinal(false)
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

  // Once the last open document-level query is answered the server moves
  // the application back to Under Review; mirror that locally since
  // re-fetching needs a new OTP. result.documents is always non-empty (it's
  // every required document DEFINITION for the category, LEFT JOINed
  // against any actually-uploaded row — see api/applications/status's
  // query), so `.length === 0` never fires.
  //
  // An application-level query (queryApplicationAction, no
  // application_documents rows at all when it's raised) shows up here as
  // every document having a null/falsy verificationStatus. The query is
  // resolved only once EVERY document has been uploaded (some truthy
  // status) — checking "at least one" instead of "every one" was the bug
  // reported live via screenshot: after uploading just 2 of 4 required
  // documents, `.some()` was already true (2 truthy out of 4), so the page
  // flipped to "Under Review" and hid the upload option for the 2 still
  // genuinely missing documents.
  const allDocumentsUploaded = result?.documents.every(doc => !!doc.verificationStatus) ?? false
  const hasOpenQuery = !allDocumentsUploaded || (result?.documents.some(doc => doc.verificationStatus === 'query') ?? false)

  const effectiveStatus =
    result && result.status === 'query_raised' && !hasOpenQuery ? 'under_review' : (result?.status ?? '')

  const statusText = STATUS_LABEL[effectiveStatus]?.[lang === 'hi' ? 'hi' : 'en'] ?? effectiveStatus

  // DocumentsStep (shared with the apply form) always allows upload/replace
  // on whatever it's given — it has no concept of "locked unless a query is
  // open," which is correct for the apply form (pre-submission, everything
  // is always editable) but not here, where a document should only be
  // actionable while this specific status page is responding to a raised
  // query. Only documents actually needing a response go through it;
  // everything else stays a compact read-only line (no accidental re-upload
  // outside of a query).
  const actionableDocuments: DocumentRow[] = []
  const readOnlyDocuments: DocumentRow[] = []

  for (const doc of result?.documents ?? []) {
    const needsResponse =
      doc.verificationStatus === 'query' || (effectiveStatus === 'query_raised' && !doc.verificationStatus)

    ;(needsResponse ? actionableDocuments : readOnlyDocuments).push(doc)
  }

  const documentsForStep: CategoryDocumentDto[] = actionableDocuments.map(doc => ({
    key: doc.documentKey,
    label: doc.label,
    labelHi: doc.labelHi,
    required: Boolean(doc.isRequired),
    allowedMimeTypes: doc.allowedMimeTypes ? doc.allowedMimeTypes.split(',') : ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: doc.maxSizeBytes || 5 * 1024 * 1024
  }))

  const uploadStateForStep: DocumentUploadState = Object.fromEntries(
    actionableDocuments.map(doc => [
      doc.documentKey,
      uploadErrors[doc.documentKey]
        ? { status: 'error' as const, error: uploadErrors[doc.documentKey] }
        : uploadingKey === doc.documentKey
          ? { status: 'uploading' as const }
          : doc.verificationStatus
            ? { status: 'uploaded' as const, fileName: doc.originalFilename ?? undefined, documentId: doc.documentId ?? undefined }
            : { status: 'idle' as const }
    ])
  )
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
              ? otpWhatsappEnabled
                ? lang === 'hi'
                  ? `आपके पंजीकृत मोबाइल/व्हाट्सएप नंबर (...${(maskedMobile || '').slice(-4)}) पर भेजा गया 6-अंकों का सत्यापन कोड दर्ज करें।`
                  : `Enter the 6-digit verification code sent to your registered WhatsApp number ending ${(maskedMobile || '').slice(-4)}.`
                : lang === 'hi'
                  ? `आपके पंजीकृत मोबाइल नंबर (...${(maskedMobile || '').slice(-4)}) से जुड़े ईमेल पर भेजा गया 6-अंकों का सत्यापन कोड दर्ज करें।`
                  : `Enter the 6-digit verification code emailed to the address linked to your registered mobile number ending ${(maskedMobile || '').slice(-4)}.`
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
                clearStatusSession()
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
            {/* Query Raised Alert — moved to the very top of the page per
                explicit feedback (2026-11-02): this previously only showed
                as a muted blue info-line at the bottom of the Application
                Details card, easy to miss entirely when the applicant had
                already scrolled past the "No action needed" assumption.
                An open query is the single most important thing on this
                page when it exists — it blocks the application from moving
                forward until the applicant responds — so it now gets the
                same prominent alert-card treatment already used for
                Payment Pending / Payment Required below. */}
            {effectiveStatus === 'query_raised' && (
              <div className='overflow-hidden rounded-xl border border-amber-300 bg-amber-50 shadow-xs'>
                <div className='flex items-start gap-3 p-4 sm:p-5'>
                  <InfoIcon className='mt-0.5 size-5 shrink-0 text-amber-700' />
                  <div className='flex-1'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h2 className='text-base font-bold text-amber-950'>
                        {lang === 'hi' ? 'कार्रवाई आवश्यक: स्पष्टीकरण' : 'Action Needed: Query Raised'}
                      </h2>
                      {(result.queryHistory?.length ?? 0) > 1 && (
                        <span className='rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900'>
                          {result.queryHistory?.length}{' '}
                          {lang === 'hi' ? 'टिप्पणियाँ' : result.queryHistory!.length === 1 ? 'note' : 'notes'}
                        </span>
                      )}
                    </div>

                    {/* Every query raised so far — not just the latest —
                        per explicit feedback (2026-11-03): a second or
                        third round of back-and-forth previously lost
                        everything before the most recent remark. */}
                    {result.queryHistory && result.queryHistory.length > 0 ? (
                      <ul className='mt-2.5 flex flex-col gap-2'>
                        {result.queryHistory.map((entry, idx) => (
                          <li key={idx} className='rounded-lg bg-white/70 px-3 py-2 text-xs sm:text-sm text-amber-900'>
                            {entry.documentLabel && (
                              <span className='mr-1.5 font-bold'>{entry.documentLabel}:</span>
                            )}
                            <span className='leading-relaxed'>{entry.remarks}</span>
                            <span className='ml-2 text-[11px] text-amber-700/80'>
                              {new Date(entry.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='mt-2 text-xs sm:text-sm text-amber-900 leading-relaxed'>
                        {lang === 'hi'
                          ? 'समीक्षा टीम को एक सही दस्तावेज़ की आवश्यकता है। कृपया नीचे दिए गए अनुभाग में अपलोड करें।'
                          : 'The review team needs a corrected document. Please upload it in the section below.'}
                      </p>
                    )}

                    <a
                      href='#documents-status'
                      className='mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#0c2847] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#071a2f] transition'
                    >
                      <UploadIcon className='size-3.5' />
                      {lang === 'hi' ? 'दस्तावेज़ अपलोड करने के लिए जाएं' : 'Go to Upload Documents'}
                    </a>
                  </div>
                </div>
              </div>
            )}

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

            {/* Auction Participation Fee Required Card (migration 0077) */}
            {effectiveStatus === 'selected_for_auction' && (
              <div className='overflow-hidden rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 via-orange-50/70 to-amber-50 p-5 sm:p-6 shadow-sm'>
                <div className='flex items-start gap-4'>
                  <div className='rounded-xl bg-amber-500 p-2.5 text-white shrink-0 shadow-xs'>
                    <StoreIcon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h2 className='text-lg font-bold text-amber-950'>
                        {lang === 'hi' ? 'नीलामी भागीदारी शुल्क आवश्यक' : 'Auction Participation Fee Required'}
                      </h2>
                      <span className='rounded-full bg-amber-200/90 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-300 shadow-2xs'>
                        {lang === 'hi' ? 'भुगतान आवश्यक' : 'Payment Required'}
                      </span>
                    </div>

                    <p className='mt-2 text-xs sm:text-sm text-amber-900/95 leading-relaxed'>
                      {lang === 'hi'
                        ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026 के अंतर्गत भौतिक नीलामी (Physical Auction) राउंड हेतु ड्रा में आपका चयन हुआ है। भुगतान के बाद आपको कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा नीलामी हेतु आमंत्रित किया जाएगा।'
                        : 'You have been selected in the draw for the physical auction round for International Gita Mahotsav 2026. Once paid, you will be invited to the auction conducted by Kurukshetra Development Board (KDB).'}
                    </p>

                    {result.auctionParticipationFeePaise !== null && (
                      <div className='mt-4 grid grid-cols-1 rounded-lg bg-white/90 p-3.5 text-xs border border-amber-200/80 shadow-2xs'>
                        <div>
                          <span className='text-slate-500 block text-[11px] font-semibold uppercase tracking-wider'>
                            {lang === 'hi' ? 'नीलामी भागीदारी शुल्क' : 'Auction Participation Fee'}
                          </span>
                          <span className='text-base font-extrabold text-amber-950'>
                            ₹{(Number(result.auctionParticipationFeePaise) / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )}

                    {auctionFeePaymentError && (
                      <div className='mt-3'>
                        <Alert variant='destructive'>
                          <AlertCircleIcon className='size-4' />
                          <AlertDescription>{auctionFeePaymentError}</AlertDescription>
                        </Alert>
                      </div>
                    )}

                    <div className='mt-4'>
                      <Button
                        type='button'
                        onClick={handlePayAuctionFee}
                        disabled={isPayingAuctionFee}
                        className='w-full bg-[#0c2847] hover:bg-[#071a2f] text-white font-bold text-sm shadow-md h-11'
                      >
                        {isPayingAuctionFee ? (
                          <>
                            <Loader2Icon className='size-4 animate-spin mr-2' />
                            {lang === 'hi' ? 'पेमेंट गेटवे खुल रहा है...' : 'Opening Payment Gateway...'}
                          </>
                        ) : (
                          <>
                            <CreditCardIcon className='size-4 mr-2' />
                            {lang === 'hi'
                              ? `नीलामी भागीदारी शुल्क का भुगतान करें${result.auctionParticipationFeePaise !== null ? ` (₹${(Number(result.auctionParticipationFeePaise) / 100).toLocaleString('en-IN')})` : ''}`
                              : `Pay Auction Participation Fee${result.auctionParticipationFeePaise !== null ? ` (₹${(Number(result.auctionParticipationFeePaise) / 100).toLocaleString('en-IN')})` : ''}`}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auction Fee Paid — Waiting for Physical Auction Card (migration 0077) */}
            {effectiveStatus === 'auction_fee_paid' && (
              <div className='overflow-hidden rounded-xl border-2 border-cyan-400 bg-linear-to-br from-cyan-50 via-sky-50/60 to-cyan-50 p-5 sm:p-6 shadow-sm'>
                <div className='flex items-start gap-4'>
                  <div className='rounded-xl bg-cyan-600 p-2.5 text-white shrink-0 shadow-xs'>
                    <CheckCircle2Icon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <h2 className='text-lg font-bold text-cyan-950'>
                      {lang === 'hi' ? 'नीलामी शुल्क भुगतान प्राप्त हुआ' : 'Auction Fee Received'}
                    </h2>
                    <p className='mt-2 text-xs sm:text-sm text-cyan-900/95 leading-relaxed'>
                      {lang === 'hi'
                        ? 'आपका नीलामी भागीदारी शुल्क प्राप्त हो गया है। आपको कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा आयोजित भौतिक नीलामी हेतु आमंत्रित किया जाएगा। नीलामी के परिणाम हेतु यह पृष्ठ दोबारा देखें।'
                        : 'Your auction participation fee has been received. You will be invited to the physical auction conducted by Kurukshetra Development Board (KDB). Check back on this page for your auction result.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auction Won — Final Payment Required Card (migration 0077) */}
            {effectiveStatus === 'auction_won' && (
              <div className='overflow-hidden rounded-xl border-2 border-amber-400 bg-linear-to-br from-amber-50 via-orange-50/70 to-amber-50 p-5 sm:p-6 shadow-sm'>
                <div className='flex items-start gap-4'>
                  <div className='rounded-xl bg-amber-500 p-2.5 text-white shrink-0 shadow-xs'>
                    <StoreIcon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h2 className='text-lg font-bold text-amber-950'>
                        {lang === 'hi' ? 'नीलामी जीती! अंतिम भुगतान आवश्यक' : 'Auction Won! Final Payment Required'}
                      </h2>
                      <span className='rounded-full bg-amber-200/90 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-300 shadow-2xs'>
                        {lang === 'hi' ? 'भुगतान आवश्यक' : 'Payment Required'}
                      </span>
                    </div>

                    <p className='mt-2 text-xs sm:text-sm text-amber-900/95 leading-relaxed'>
                      {lang === 'hi'
                        ? 'बधाई हो! कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा आयोजित भौतिक नीलामी में आपने बूथ/स्टॉल जीता है। आवंटन की पुष्टि हेतु कृपया नीचे अपना अंतिम नीलामी भुगतान पूर्ण करें।'
                        : 'Congratulations! You won a booth/stall at the physical auction conducted by Kurukshetra Development Board (KDB). Please complete your final auction payment below to confirm your allotment.'}
                    </p>

                    {result.stallNumber && (
                      <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg bg-white/90 p-3.5 text-xs border border-amber-200/80 shadow-2xs'>
                        <div>
                          <span className='text-slate-500 block text-[11px] font-semibold uppercase tracking-wider'>
                            {lang === 'hi' ? 'आवंटित स्टॉल क्रमांक' : 'Allotted Stall No.'}
                          </span>
                          <span className='font-mono text-base font-extrabold text-[#0c2847]'>
                            {result.stallNumber}
                          </span>
                        </div>

                        {result.auctionFinalAmountPaise !== null && (
                          <div>
                            <span className='text-slate-500 block text-[11px] font-semibold uppercase tracking-wider'>
                              {lang === 'hi' ? 'अंतिम नीलामी राशि' : 'Final Auction Amount'}
                            </span>
                            <span className='text-base font-extrabold text-amber-950'>
                              ₹{(Number(result.auctionFinalAmountPaise) / 100).toLocaleString('en-IN')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {auctionFinalPaymentError && (
                      <div className='mt-3'>
                        <Alert variant='destructive'>
                          <AlertCircleIcon className='size-4' />
                          <AlertDescription>{auctionFinalPaymentError}</AlertDescription>
                        </Alert>
                      </div>
                    )}

                    <div className='mt-4'>
                      <Button
                        type='button'
                        onClick={handlePayAuctionFinal}
                        disabled={isPayingAuctionFinal}
                        className='w-full bg-[#0c2847] hover:bg-[#071a2f] text-white font-bold text-sm shadow-md h-11'
                      >
                        {isPayingAuctionFinal ? (
                          <>
                            <Loader2Icon className='size-4 animate-spin mr-2' />
                            {lang === 'hi' ? 'पेमेंट गेटवे खुल रहा है...' : 'Opening Payment Gateway...'}
                          </>
                        ) : (
                          <>
                            <CreditCardIcon className='size-4 mr-2' />
                            {lang === 'hi'
                              ? `अंतिम भुगतान करें${result.auctionFinalAmountPaise !== null ? ` (₹${(Number(result.auctionFinalAmountPaise) / 100).toLocaleString('en-IN')})` : ''}`
                              : `Pay Final Amount${result.auctionFinalAmountPaise !== null ? ` (₹${(Number(result.auctionFinalAmountPaise) / 100).toLocaleString('en-IN')})` : ''}`}
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
              {/* query_raised's hint is shown via the prominent top-of-page
                  alert card instead (see above) — showing it again here
                  as a muted info-line would be a duplicate, and was the
                  original problem being fixed. */}
              {hint && effectiveStatus !== 'query_raised' && (
                <div className='border-t border-slate-200 bg-blue-50/40 px-5 py-3 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5'>
                  <InfoIcon className='size-4 text-blue-600 shrink-0 mt-0.5' />
                  <span>{hint}</span>
                </div>
              )}
            </div>

            {/* Documents Verification Status Card — reuses the exact same
                DocumentsStep component the apply form uses, rather than a
                separate hand-rolled list, per explicit request (2026-11-02:
                "jo doc ab form mai uplaod karwa re hai, vahi options aane
                chahiye in mai bhi"). Gives consistent upload/replace
                buttons, file-type/size hints, drag-and-drop, and an in-page
                preview — not just a bare file input. Moved into this wide
                main column (was the narrow sidebar) per a further request
                (2026-11-03) — DocumentsStep's table layout needs more width
                than the sidebar column gives it; labels were truncating. */}
            {result.documents.length > 0 && (
              <div id='documents-status' className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs scroll-mt-4'>
                <div className='border-b border-slate-200 px-5 py-3.5 bg-slate-50/60'>
                  <p className='text-xs font-bold text-[#0c2847] uppercase tracking-wider'>
                    {lang === 'hi' ? 'संलग्न दस्तावेज़ स्थिति' : 'Attached Documents Status'}
                  </p>
                </div>

                <div className='p-4 sm:p-5'>
                  {/* Per-document remarks — the full query history (every
                      round, application-level and document-level) already
                      shows at the top of the page; this is deliberately
                      scoped to just the documents actually listed below, so
                      it reads as "here's what to fix on THIS document"
                      rather than repeating the same messages twice. */}
                  {actionableDocuments.some(doc => doc.verificationRemarks) && (
                    <div className='mb-4 flex flex-col gap-2'>
                      {actionableDocuments
                        .filter(doc => doc.verificationRemarks)
                        .map(doc => (
                          <div key={doc.documentKey} className='rounded-lg border border-amber-200 bg-amber-50/60 p-3'>
                            <p className='text-xs leading-relaxed text-amber-950'>
                              <span className='font-bold'>
                                {lang === 'hi' ? doc.labelHi || doc.label : doc.label}:{' '}
                              </span>
                              {doc.verificationRemarks}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}

                  {actionableDocuments.length > 0 && (
                    <DocumentsStep
                      documents={documentsForStep}
                      uploadState={uploadStateForStep}
                      onUpload={respondToQuery}
                      accessToken={result.accessToken ?? null}
                    />
                  )}

                  {readOnlyDocuments.length > 0 && (
                    <ul className={`divide-y divide-slate-100 ${actionableDocuments.length > 0 ? 'mt-4 border-t border-slate-100 pt-2' : ''}`}>
                      {readOnlyDocuments.map(doc => {
                        const cfg = doc.verificationStatus
                          ? getDocumentStatusConfig(doc.verificationStatus)
                          : { label: '', color: 'bg-gray-100 text-gray-700' }

                        const statusLabel = doc.verificationStatus
                          ? lang === 'hi'
                            ? (DOCUMENT_STATUS_HI[doc.verificationStatus] ?? cfg.label)
                            : (DOCUMENT_STATUS_LABEL_EN[doc.verificationStatus] ?? cfg.label)
                          : lang === 'hi'
                            ? 'अपलोड नहीं हुआ'
                            : 'Not uploaded'

                        return (
                          <li key={doc.documentKey} className='flex items-center justify-between gap-3 py-2.5 text-xs sm:text-sm'>
                            <span className='font-medium text-slate-800'>
                              {lang === 'hi' ? doc.labelHi || doc.label : doc.label}
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cfg.color}`}>
                              {statusLabel}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
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
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusLookup
