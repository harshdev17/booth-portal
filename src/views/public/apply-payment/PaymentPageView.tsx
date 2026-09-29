'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  Loader2Icon,
  LockIcon,
  ShieldCheckIcon
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/LanguageContext'

type StatusResponse = {
  applicationId: number
  applicationNumber: string
  categoryName: string
  categorySlug: string
  status: string
  feePaise?: number | null
  feeBasePaise?: number | null
  gstPercent?: number | null
  submittedAt: string | null
}

type RazorpayCheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  theme: { color: string }
  prefill?: { method?: 'card' | 'netbanking' | 'upi' }
  handler: (response: RazorpayCheckoutResponse) => void
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open: () => void }
  }
}

const RAZORPAY_CHECKOUT_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadRazorpayCheckoutScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) {
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

function findAccessTokenForApplicationNumber(applicationNumber: string): string | null {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)

      if (!key?.startsWith('kdb_application_access_')) continue

      const raw = sessionStorage.getItem(key)

      if (!raw) continue

      const parsed = JSON.parse(raw) as { accessToken: string; applicationNumber: string }

      if (parsed.applicationNumber === applicationNumber) {
        return parsed.accessToken
      }
    }
  } catch {
    // sessionStorage unavailable
  }

  return null
}

const PaymentPageView = ({
  categorySlug,
  applicationNumber
}: {
  categorySlug: string
  applicationNumber: string
}) => {
  const router = useRouter()
  const { lang } = useLanguage()

  const [accessToken] = useState<string | null>(() => findAccessTokenForApplicationNumber(applicationNumber))
  const [details, setDetails] = useState<StatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi')

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const response = await fetch('/api/applications/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationNumber, accessToken: accessToken ?? '' })
        })

        const body = await response.json()

        if (response.ok) {
          setDetails(body)

          if (body.status === 'payment_success' || body.status === 'under_review') {
            router.replace(`/apply/${categorySlug}/success/${applicationNumber}`)
          }
        } else {
          setLoadError(
            body.error ??
              (lang === 'hi'
                ? 'आवेदन विवरण लोड नहीं हो सका।'
                : 'Could not load your application fee details.')
          )
        }
      } catch {
        setLoadError(
          lang === 'hi'
            ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
            : 'Could not reach the server. Please check your connection and try again.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetails()
  }, [accessToken, applicationNumber, categorySlug, lang, router])

  const failMessage = lang === 'hi' ? 'भुगतान शुरू नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not start the payment. Please try again.'

  const handlePayment = async () => {
    if (!accessToken || !details?.applicationId) {
      setLoadError(failMessage)

      return
    }

    setLoadError(null)
    setIsProcessing(true)

    try {
      const scriptLoaded = await loadRazorpayCheckoutScript()

      if (!scriptLoaded) {
        setLoadError(
          lang === 'hi'
            ? 'पेमेंट गेटवे लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
            : 'Could not load the payment gateway. Please check your internet connection and try again.'
        )
        setIsProcessing(false)

        return
      }

      const orderResponse = await fetch(`/api/applications/${details.applicationId}/payment/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      const orderBody = await orderResponse.json()

      if (!orderResponse.ok) {
        setLoadError(orderBody.error ?? failMessage)
        setIsProcessing(false)

        return
      }

      const razorpay = new window.Razorpay({
        key: orderBody.keyId,
        amount: orderBody.amountPaise,
        currency: orderBody.currency,
        order_id: orderBody.orderId,
        name: 'Kurukshetra Development Board',
        description:
          lang === 'hi'
            ? `आवेदन शुल्क — ${orderBody.applicationNumber}`
            : `Application Fee — ${orderBody.applicationNumber}`,
        theme: { color: '#0c2847' },
        prefill: { method: paymentMethod },
        handler: async response => {
          try {
            const verifyResponse = await fetch(`/api/applications/${details.applicationId}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            })

            const verifyBody = await verifyResponse.json()

            if (!verifyResponse.ok) {
              setLoadError(
                verifyBody.error ??
                  (lang === 'hi'
                    ? 'भुगतान सत्यापित नहीं हो सका। यदि राशि कट गई है तो सहायता से संपर्क करें।'
                    : 'Could not verify the payment. If you were charged, please contact support.')
              )
              setIsProcessing(false)

              return
            }

            setIsProcessing(false)
            setPaymentSuccess(true)
            setTimeout(() => {
              router.push(`/apply/${categorySlug}/success/${applicationNumber}`)
            }, 1500)
          } catch {
            setLoadError(
              lang === 'hi'
                ? 'भुगतान सत्यापन के दौरान सर्वर से संपर्क नहीं हो सका।'
                : 'Could not reach the server while verifying the payment.'
            )
            setIsProcessing(false)
          }
        },
        modal: {
          ondismiss: () => setIsProcessing(false)
        }
      })

      razorpay.open()
    } catch {
      setLoadError(failMessage)
      setIsProcessing(false)
    }
  }

  const feePaise = details?.feePaise ?? 11800
  const feeBasePaise = details?.feeBasePaise ?? 10000
  const gstPercent = details?.gstPercent ?? 18
  const gstAmount = Math.max(0, feePaise - feeBasePaise)

  if (isLoading) {
    return (
      <div className='flex min-h-[60vh] items-center justify-center'>
        <Loader2Icon className='size-8 animate-spin text-[#d8891d]' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center'>
      <div className='w-full max-w-xl text-center'>
        {/* Header with Gold Divider */}
        <div className='mb-6 flex flex-col items-center'>
          <div className='mb-2 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              अंतर्राष्ट्रीय गीता महोत्सव 2026
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
          <div className='mt-2 inline-flex size-14 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] text-[#8c5711] shadow-xs'>
            <CreditCardIcon className='size-7' />
          </div>
        </div>

        <h1 className='text-2xl sm:text-3xl font-black text-[#0c2847] tracking-tight mb-2'>
          {lang === 'hi' ? 'आवेदन शुल्क भुगतान' : 'Pay Application Fee'}
        </h1>
        <p className='mb-6 text-xs sm:text-sm text-[#526478]'>
          {lang === 'hi'
            ? 'कुरुक्षेत्र विकास बोर्ड (KDB) के सुरक्षित पेमेंट गेटवे द्वारा अपने स्टॉल आवेदन का शुल्क जमा करें।'
            : 'Complete your stall application payment securely via Kurukshetra Development Board payment gateway.'}
        </p>

        {loadError && (
          <Alert variant='destructive' className='mb-6 text-left rounded-xl'>
            <AlertCircleIcon className='size-4' />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Payment Summary Box */}
        <div className='mb-6 rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 text-left shadow-xs space-y-4'>
          <div className='flex items-center justify-between border-b border-[#f1f5f9] pb-3'>
            <div>
              <span className='text-xs font-bold uppercase tracking-wider text-[#64748b]'>
                {lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number'}
              </span>
              <p className='font-mono text-base font-bold text-[#0c2847]'>{applicationNumber}</p>
            </div>
            <div className='text-right'>
              <span className='text-xs font-bold uppercase tracking-wider text-[#64748b]'>
                {lang === 'hi' ? 'श्रेणी' : 'Category'}
              </span>
              <p className='text-sm font-bold text-[#0c2847]'>{details?.categoryName ?? categorySlug}</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between text-[#64748b]'>
              <span>{lang === 'hi' ? 'मूल आवेदन शुल्क (Base Fee):' : 'Base Application Fee:'}</span>
              <span className='font-semibold text-[#0c2847]'>₹{(feeBasePaise / 100).toLocaleString('en-IN')}</span>
            </div>
            {gstAmount > 0 && (
              <div className='flex justify-between text-[#64748b]'>
                <span>
                  {lang === 'hi'
                    ? `लागू जीएसटी (${gstPercent}% GST):`
                    : `Applicable GST (${gstPercent}%):`}
                </span>
                <span className='font-semibold text-[#0c2847]'>₹{(gstAmount / 100).toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className='flex justify-between border-t border-[#e2e8f0] pt-3 text-base font-extrabold text-[#0c2847]'>
              <span>{lang === 'hi' ? 'कुल देय राशि:' : 'Total Payable Amount:'}</span>
              <span className='text-xl font-black text-[#d8891d]'>
                ₹{(feePaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className='border-t border-[#f1f5f9] pt-4'>
            <p className='mb-2.5 text-xs font-bold uppercase tracking-wider text-[#64748b]'>
              {lang === 'hi' ? 'भुगतान का माध्यम चुनें' : 'Select Payment Mode'}
            </p>
            <div className='grid grid-cols-3 gap-2'>
              {[
                { id: 'upi', label: 'UPI / QR' },
                { id: 'card', label: lang === 'hi' ? 'डेबिट/क्रेडिट कार्ड' : 'Card' },
                { id: 'netbanking', label: lang === 'hi' ? 'नेट बैंकिंग' : 'NetBanking' }
              ].map(method => (
                <button
                  key={method.id}
                  type='button'
                  onClick={() => setPaymentMethod(method.id as 'upi' | 'card' | 'netbanking')}
                  className={`rounded-xl border p-2.5 text-xs font-bold transition text-center ${
                    paymentMethod === method.id
                      ? 'border-[#0c2847] bg-[#0c2847] text-white shadow-xs'
                      : 'border-[#e2e8f0] bg-[#fafbfc] text-[#334155] hover:bg-[#f1f5f9]'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className='mb-6 flex items-center justify-center gap-2 text-xs text-[#059669] font-semibold'>
          <ShieldCheckIcon className='size-4 text-[#059669]' />
          <span>
            {lang === 'hi'
              ? '256-बिट SSL सुरक्षित पेमेंट एन्क्रिप्शन (KDB आधिकारिक)'
              : '256-bit SSL Secure Official Payment Gateway'}
          </span>
        </div>

        {/* Action Button */}
        <div className='flex flex-col gap-3'>
          <Button
            type='button'
            size='lg'
            disabled={isProcessing || paymentSuccess || !details?.applicationId}
            onClick={handlePayment}
            className='w-full rounded-xl bg-[#0c2847] py-4 text-base font-bold text-white shadow-md hover:bg-[#06192e] transition active:scale-[0.98]'
          >
            {isProcessing ? (
              <>
                <Loader2Icon className='mr-2 size-5 animate-spin text-[#d8891d]' />
                <span>{lang === 'hi' ? 'भुगतान संसाधित हो रहा है...' : 'Processing Payment...'}</span>
              </>
            ) : paymentSuccess ? (
              <>
                <CheckCircle2Icon className='mr-2 size-5 text-emerald-400' />
                <span>{lang === 'hi' ? 'भुगतान सफल! रीडायरेक्ट हो रहा है...' : 'Payment Successful! Redirecting...'}</span>
              </>
            ) : (
              <>
                <LockIcon className='mr-2 size-4 text-[#fbd38d]' />
                <span>
                  {lang === 'hi'
                    ? `₹${(feePaise / 100).toLocaleString('en-IN')} का भुगतान करें`
                    : `Pay ₹${(feePaise / 100).toLocaleString('en-IN')} Securely`}
                </span>
              </>
            )}
          </Button>

          <Link
            href={`/apply/${categorySlug}/review/${applicationNumber}`}
            className='text-xs text-[#64748b] hover:text-[#0c2847] transition hover:underline mt-1'
          >
            {lang === 'hi' ? '← आवेदन समीक्षा पर वापस जाएं' : '← Back to Review Application'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PaymentPageView
