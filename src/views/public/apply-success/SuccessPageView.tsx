'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CreditCardIcon,
  FileCheckIcon,
  FileTextIcon,
  HelpCircleIcon,
  HomeIcon,
  Loader2Icon,
  PhoneCallIcon,
  PrinterIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCheckIcon
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/context/LanguageContext'
import { findAccessTokenForApplicationNumber } from '@/views/public/apply/access-session'

type StatusResponse = {
  applicationId: number
  status: string
  categoryName: string
  categoryNameHi?: string | null
  categorySlug: string
  representativeName?: string
  organisationName?: string
  mobileNumber?: string
  feePaise: number | null
  feeBasePaise: number | null
  gstPercent: number | null
  submittedAt: string | null
  paymentId?: number | null
  paymentStatus?: string | null
  amountPaise?: number | null
  razorpayPaymentId?: string | null
  paidAt?: string | null
}

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
  const [isLoading, setIsLoading] = useState(true)

  const [access] = useState(() => findAccessTokenForApplicationNumber(applicationNumber))
  const accessToken = access?.accessToken ?? null
  const [loadError, setLoadError] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [isFetchingReceipt, setIsFetchingReceipt] = useState(false)
  const [isFetchingPrint, setIsFetchingPrint] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  useEffect(() => {
    const loadStatus = async () => {
      setIsLoading(true)

      try {
        const response = await fetch('/api/applications/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationNumber,
            accessToken,
            token: encryptedToken
          })
        })

        const body = await response.json()

        if (response.ok) {
          setDetails(body)
        } else {
          setLoadError(
            body.error ??
              (lang === 'hi'
                ? 'पूर्ण पुष्टिकरण विवरण लोड नहीं हो सका, लेकिन आपका आवेदन जमा हो गया है।'
                : 'Could not load full confirmation details, but your application is registered.')
          )
        }
      } catch {
        setLoadError(
          lang === 'hi'
            ? 'सर्वर से संपर्क नहीं हो सका, लेकिन आपका आवेदन सुरक्षित रूप से दर्ज है।'
            : 'Could not reach the server, but your application reference is registered.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadStatus()
  }, [accessToken, applicationNumber, encryptedToken, lang])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(applicationNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Non-fatal
    }
  }

  const goToReceipt = async () => {
    setReceiptError(null)
    setIsFetchingReceipt(true)

    try {
      const headers: Record<string, string> = {}

      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      if (encryptedToken) headers['x-application-token'] = encryptedToken

      const appId = access?.applicationId ?? details?.applicationId ?? applicationNumber
      const response = await fetch(`/api/applications/${appId}/receipt`, { headers })

      if (!response.ok) {
        const body = await response.json()

        setReceiptError(
          body.error ??
            (lang === 'hi'
              ? 'भुगतान रसीद अभी उपलब्ध नहीं है या भुगतान प्रक्रियाधीन है।'
              : 'Payment receipt is not available yet or payment is processing.')
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

  const goToPrint = async () => {
    setPrintError(null)
    setIsFetchingPrint(true)

    try {
      const headers: Record<string, string> = {}

      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      if (encryptedToken) headers['x-application-token'] = encryptedToken

      const appId = access?.applicationId ?? details?.applicationId ?? applicationNumber
      const response = await fetch(`/api/applications/${appId}/print`, { headers })

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

  const hasFee = (details?.feePaise ?? 0) > 0
  const awaitingPayment = hasFee && (details?.status === 'payment_pending' || details?.status === 'payment_failed')
  const isPaymentSuccess = hasFee && (details?.paymentStatus === 'success' || (details?.status !== 'payment_pending' && details?.status !== 'payment_failed'))
  const canShowReceipt = hasFee && isPaymentSuccess

  const categoryDisplayName =
    lang === 'hi'
      ? (details?.categoryNameHi || details?.categoryName || 'स्टॉल/बूथ आबंटन')
      : (details?.categoryName || 'Stall/Booth Allotment')

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#fbf8f3] via-[#f7f3ec] to-[#f0eae0] py-10 sm:py-14 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-4xl mx-auto flex flex-col gap-8'>
        {/* Top KDB Festival Insignia & Ornamental Divider */}
        <div className='text-center flex flex-col items-center'>
          <div className='inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#fdf5e6] border border-[#eeddb8] shadow-2xs mb-4'>
            <SparklesIcon className='size-3.5 text-[#d8891d]' />
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#8c5711] uppercase'>
              {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Gita Jayanti Mahotsav 2026'}
            </span>
          </div>

          <div className='relative h-4 w-36 sm:w-48 mb-5'>
            <Image
              src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
              alt=''
              fill
              className='object-contain'
              priority
            />
          </div>

          {/* Celebratory Icon with Soft Animated Glow */}
          <div className='relative my-2'>
            <div className='absolute -inset-2 rounded-full bg-emerald-500/20 blur-xl animate-pulse' />
            <div className='relative flex size-20 sm:size-24 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-700/25 ring-8 ring-emerald-50'>
              <CheckCircle2Icon className='size-11 sm:size-13 stroke-[2.2]' />
            </div>
          </div>

          <h1 className='mt-5 text-2xl sm:text-4xl font-black text-[#0c2847] tracking-tight'>
            {awaitingPayment
              ? lang === 'hi'
                ? 'आवेदन सुरक्षित हुआ — शुल्क भुगतान बाकी है'
                : 'Application Saved — Payment Pending'
              : lang === 'hi'
                ? 'आवेदन सफलतापूर्वक जमा हुआ!'
                : 'Application Submitted Successfully!'}
          </h1>

          <p className='mt-2.5 max-w-xl text-sm sm:text-base text-[#475569] font-medium'>
            {lang === 'hi' ? (
              <>
                कुरुक्षेत्र विकास बोर्ड (KDB) को <strong className='text-[#0c2847]'>{categoryDisplayName}</strong> हेतु आपका आवेदन प्राप्त हो गया है।
              </>
            ) : (
              <>
                Your application for <strong className='text-[#0c2847]'>{categoryDisplayName}</strong> has been officially received by Kurukshetra Development Board.
              </>
            )}
          </p>
        </div>

        {loadError && (
          <Alert variant='destructive' className='rounded-2xl border-red-200 bg-red-50 text-red-900 shadow-sm'>
            <AlertCircleIcon className='size-5 text-red-600' />
            <AlertDescription className='text-sm font-semibold'>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* HERO CARD: Official Digital Acknowledgement & Reference Number */}
        <div className='relative overflow-hidden rounded-3xl border border-[#eeddb8] bg-white shadow-xl shadow-[#0c2847]/5'>
          {/* Top Tricolor / Gold Accent Bar */}
          <div className='h-2.5 w-full bg-gradient-to-r from-[#0c2847] via-[#d8891d] to-[#0c2847]' />

          <div className='p-6 sm:p-9'>
            {/* Header row inside card */}
            <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-5'>
              <div className='flex items-center gap-2.5'>
                <ShieldCheckIcon className='size-5 text-[#d8891d]' />
                <span className='text-xs font-black uppercase tracking-widest text-[#0c2847]'>
                  {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड • डिजिटल पावती' : 'Kurukshetra Development Board • Digital Acknowledgement'}
                </span>
              </div>

              {/* Status Pill Badge */}
              <div>
                {awaitingPayment ? (
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800 border border-amber-200/80'>
                    <ClockIcon className='size-3.5' />
                    {lang === 'hi' ? 'भुगतान प्रतीक्षित (Pending)' : 'Payment Pending'}
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/80'>
                    <CheckIcon className='size-3.5 text-emerald-600 stroke-[3]' />
                    {lang === 'hi' ? 'सफलतापूर्वक सबमिट (Submitted)' : 'Successfully Submitted'}
                  </span>
                )}
              </div>
            </div>

            {/* Application Reference Callout Block */}
            <div className='mt-6 rounded-2xl border-2 border-[#f0e2cc] bg-gradient-to-br from-[#fdfbf7] via-[#fcf7ee] to-[#f9f2e3] p-6 text-center shadow-xs'>
              <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#8c5711] uppercase'>
                {lang === 'hi' ? 'आवेदन संदर्भ क्रमांक (Application Reference Number)' : 'Application Reference Number'}
              </span>

              <div className='mt-2 flex flex-wrap items-center justify-center gap-3'>
                <span className='font-mono text-2xl sm:text-4xl font-black text-[#0c2847] tracking-wider selection:bg-[#d8891d]/20'>
                  {applicationNumber}
                </span>

                <button
                  type='button'
                  onClick={copy}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-[#d8891d]/40 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-[#0c2847] shadow-xs hover:bg-[#fff9ef] hover:border-[#d8891d] transition active:scale-95'
                >
                  {copied ? (
                    <>
                      <CheckIcon className='size-4 text-emerald-600 stroke-[3]' />
                      <span className='text-emerald-700 font-extrabold'>{lang === 'hi' ? 'कॉपी हो गया!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className='size-4 text-[#8c5711]' />
                      <span>{lang === 'hi' ? 'कॉपी करें' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              <p className='mt-3 text-xs sm:text-sm text-[#786348] font-medium'>
                {lang === 'hi'
                  ? 'कृपया इस संदर्भ संख्या को सुरक्षित रखें। भविष्य के सभी पत्राचार एवं आबंटन परिणाम इसी क्रमांक से जांचे जाएंगे।'
                  : 'Please save this reference number. All future communications, scrutiny updates and allotment results will require this number.'}
              </p>
            </div>

            {/* In-Card Error Notice if receipt or print fetch fails */}
            {(receiptError || printError) && (
              <div className='mt-6'>
                <Alert variant='destructive' className='rounded-xl border-red-200 bg-red-50 text-red-900'>
                  <AlertCircleIcon className='size-4 text-red-600' />
                  <AlertDescription className='text-sm font-medium'>{receiptError ?? printError}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Awaiting Payment Banner (If user cancelled gateway or arrived unpaid) */}
            {awaitingPayment && (
              <div className='mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5 sm:p-6'>
                <div className='flex items-start gap-3.5'>
                  <div className='rounded-xl bg-amber-500 p-2 text-white shrink-0 shadow-xs'>
                    <CreditCardIcon className='size-6' />
                  </div>
                  <div className='flex-1'>
                    <h2 className='text-base sm:text-lg font-bold text-amber-950'>
                      {lang === 'hi' ? 'आवेदन शुल्क का भुगतान अभी बाकी है' : 'Application Fee Payment is Pending'}
                    </h2>
                    <p className='mt-1 text-xs sm:text-sm text-amber-800 leading-relaxed'>
                      {lang === 'hi'
                        ? 'आपका आवेदन तभी पूर्ण माना जाएगा और जांच समिति के पास जाएगा जब निर्धारित आवेदन शुल्क का भुगतान सफलतापूर्वक पूरा हो जाएगा।'
                        : 'Your application will only be considered final and sent for scrutiny after the required application fee has been paid successfully.'}
                    </p>
                    <div className='mt-4 flex flex-wrap gap-3'>
                      <Link
                        href={`/apply/${details?.categorySlug ?? 'category'}/payment/${applicationNumber}`}
                        className='inline-flex items-center justify-center gap-2 rounded-xl bg-[#d8891d] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#b8741a] transition active:scale-95'
                      >
                        <CreditCardIcon className='size-4' />
                        <span>
                          {lang === 'hi'
                            ? `अभी भुगतान करें — ₹${(((details?.feePaise ?? 0)) / 100).toLocaleString('en-IN')}`
                            : `Pay Now — ₹${(((details?.feePaise ?? 0)) / 100).toLocaleString('en-IN')}`}
                        </span>
                        <ArrowRightIcon className='size-4' />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRIMARY ACTION HUB: Print Form & Download Receipt */}
            <div className='mt-8 pt-6 border-t border-[#f1f5f9]'>
              <h2 className='text-xs font-black uppercase tracking-wider text-[#64748b] mb-4 text-center sm:text-left'>
                {lang === 'hi' ? 'दस्तावेज़ एवं रसीद प्रिंट (Download & Print Documents)' : 'Download & Print Documents'}
              </h2>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                {/* Print Application Form Button */}
                <button
                  type='button'
                  onClick={goToPrint}
                  disabled={isFetchingPrint}
                  className='group relative flex items-center justify-between gap-3 rounded-2xl border-2 border-[#0c2847] bg-[#0c2847] p-4 text-left text-white shadow-sm transition hover:bg-[#06192e] hover:border-[#06192e] active:scale-[0.99] disabled:opacity-60'
                >
                  <div className='flex items-center gap-3.5'>
                    <div className='flex size-11 items-center justify-center rounded-xl bg-white/10 text-[#f59e0b] shrink-0 group-hover:scale-105 transition'>
                      {isFetchingPrint ? (
                        <Loader2Icon className='size-5 animate-spin text-white' />
                      ) : (
                        <PrinterIcon className='size-5 text-white' />
                      )}
                    </div>
                    <div>
                      <div className='text-sm sm:text-base font-bold text-white'>
                        {lang === 'hi' ? 'आवेदन पत्र प्रिंट करें' : 'Print Application Form'}
                      </div>
                      <div className='text-xs text-white/75'>
                        {lang === 'hi' ? 'पूर्ण विवरण सहित PDF सारांश' : 'Complete application PDF summary'}
                      </div>
                    </div>
                  </div>
                  <span className='text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition font-bold'>→</span>
                </button>

                {/* Download Payment Receipt Button */}
                {canShowReceipt ? (
                  <button
                    type='button'
                    onClick={goToReceipt}
                    disabled={isFetchingReceipt}
                    className='group relative flex items-center justify-between gap-3 rounded-2xl border-2 border-[#d8891d] bg-gradient-to-r from-[#d8891d] to-[#c27613] p-4 text-left text-white shadow-sm transition hover:from-[#c27613] hover:to-[#a9630a] active:scale-[0.99] disabled:opacity-60'
                  >
                    <div className='flex items-center gap-3.5'>
                      <div className='flex size-11 items-center justify-center rounded-xl bg-white/20 text-white shrink-0 group-hover:scale-105 transition'>
                        {isFetchingReceipt ? (
                          <Loader2Icon className='size-5 animate-spin text-white' />
                        ) : (
                          <FileTextIcon className='size-5 text-white' />
                        )}
                      </div>
                      <div>
                        <div className='text-sm sm:text-base font-bold text-white'>
                          {lang === 'hi' ? 'भुगतान रसीद डाउनलोड करें' : 'Download Payment Receipt'}
                        </div>
                        <div className='text-xs text-white/85'>
                          {lang === 'hi' ? 'आधिकारिक GST टैक्स इनवॉइस' : 'Official GST tax invoice receipt'}
                        </div>
                      </div>
                    </div>
                    <span className='text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition font-bold'>→</span>
                  </button>
                ) : (
                  <Link
                    href='/status'
                    className='group relative flex items-center justify-between gap-3 rounded-2xl border-2 border-[#e2e8f0] bg-white p-4 text-left text-[#0c2847] shadow-xs transition hover:border-[#0c2847] hover:bg-[#fafaf9] active:scale-[0.99]'
                  >
                    <div className='flex items-center gap-3.5'>
                      <div className='flex size-11 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#0c2847] shrink-0 group-hover:bg-[#e2e8f0] transition'>
                        <ClockIcon className='size-5 text-[#0c2847]' />
                      </div>
                      <div>
                        <div className='text-sm sm:text-base font-bold text-[#0c2847]'>
                          {lang === 'hi' ? 'आवेदन स्थिति ट्रैक करें' : 'Track Application Status'}
                        </div>
                        <div className='text-xs text-[#64748b]'>
                          {lang === 'hi' ? 'सत्यापन व परिणाम जांचें' : 'Check review & result updates'}
                        </div>
                      </div>
                    </div>
                    <span className='text-[#94a3b8] group-hover:text-[#0c2847] group-hover:translate-x-0.5 transition font-bold'>→</span>
                  </Link>
                )}
              </div>
            </div>

            {/* DETAILS GRID: Structured Summary Tiles */}
            <div className='mt-8 pt-6 border-t border-[#f1f5f9]'>
              <h2 className='text-xs font-black uppercase tracking-wider text-[#64748b] mb-4'>
                {lang === 'hi' ? 'आवेदन एवं भुगतान विवरण' : 'Application & Payment Summary'}
              </h2>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-left'>
                {/* Applicant Name */}
                <div className='rounded-2xl border border-[#f1f5f9] bg-[#faf8f5] p-4 shadow-2xs'>
                  <div className='flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                    <UserCheckIcon className='size-4 text-[#d8891d]' />
                    <span>{lang === 'hi' ? 'आवेदक / संस्था का नाम' : 'Applicant / Organisation'}</span>
                  </div>
                  <div className='mt-1.5 text-sm sm:text-base font-bold text-[#0c2847] truncate'>
                    {details?.representativeName || (isLoading ? '...' : '—')}
                  </div>
                  {details?.organisationName && (
                    <div className='text-xs text-[#64748b] truncate mt-0.5'>{details.organisationName}</div>
                  )}
                </div>

                {/* Category */}
                <div className='rounded-2xl border border-[#f1f5f9] bg-[#faf8f5] p-4 shadow-2xs'>
                  <div className='flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                    <FileCheckIcon className='size-4 text-[#d8891d]' />
                    <span>{lang === 'hi' ? 'आवेदन श्रेणी' : 'Category'}</span>
                  </div>
                  <div className='mt-1.5 text-sm sm:text-base font-bold text-[#0c2847] truncate'>
                    {categoryDisplayName}
                  </div>
                  <div className='text-xs text-[#64748b] truncate mt-0.5'>
                    {lang === 'hi' ? 'कुरुक्षेत्र मेला क्षेत्र 2026' : 'Kurukshetra Fair Area 2026'}
                  </div>
                </div>

                {/* Registered Mobile */}
                <div className='rounded-2xl border border-[#f1f5f9] bg-[#faf8f5] p-4 shadow-2xs'>
                  <div className='flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                    <PhoneCallIcon className='size-4 text-[#d8891d]' />
                    <span>{lang === 'hi' ? 'पंजीकृत मोबाइल' : 'Registered Mobile'}</span>
                  </div>
                  <div className='mt-1.5 font-mono text-sm sm:text-base font-bold text-[#0c2847]'>
                    {details?.mobileNumber ? `+91 ${details.mobileNumber}` : (isLoading ? '...' : '—')}
                  </div>
                  <div className='text-xs text-emerald-700 font-semibold mt-0.5 flex items-center gap-1'>
                    <CheckIcon className='size-3 text-emerald-600 stroke-[3]' />
                    <span>{lang === 'hi' ? 'OTP सत्यापित' : 'OTP Verified'}</span>
                  </div>
                </div>

                {/* Submission Timestamp */}
                <div className='rounded-2xl border border-[#f1f5f9] bg-[#faf8f5] p-4 shadow-2xs'>
                  <div className='flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                    <ClockIcon className='size-4 text-[#d8891d]' />
                    <span>{lang === 'hi' ? 'आवेदन समय (IST)' : 'Submission Timestamp'}</span>
                  </div>
                  <div className='mt-1.5 text-xs sm:text-sm font-bold text-[#0c2847]'>
                    {details?.submittedAt
                      ? new Date(details.submittedAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : (isLoading ? '...' : '—')}
                  </div>
                  <div className='text-xs text-[#64748b] mt-0.5'>{lang === 'hi' ? 'भारतीय मानक समय' : 'Indian Standard Time'}</div>
                </div>

                {/* Fee & Payment Status */}
                <div className='rounded-2xl border border-[#f1f5f9] bg-[#faf8f5] p-4 shadow-2xs'>
                  <div className='flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                    <CreditCardIcon className='size-4 text-[#d8891d]' />
                    <span>{lang === 'hi' ? 'आवेदन शुल्क राशि' : 'Application Fee'}</span>
                  </div>
                  <div className='mt-1.5 flex items-center gap-2'>
                    <span className='text-base sm:text-lg font-black text-[#0c2847]'>
                      {hasFee ? `₹${(((details?.feePaise ?? 0)) / 100).toLocaleString('en-IN')}` : (lang === 'hi' ? 'निःशुल्क (Free)' : 'Free')}
                    </span>
                    {hasFee && isPaymentSuccess && (
                      <span className='rounded-md bg-emerald-100 px-2 py-0.5 text-2xs font-extrabold text-emerald-800 uppercase'>
                        {lang === 'hi' ? 'सफल (PAID)' : 'PAID'}
                      </span>
                    )}
                    {hasFee && awaitingPayment && (
                      <span className='rounded-md bg-amber-100 px-2 py-0.5 text-2xs font-extrabold text-amber-800 uppercase'>
                        {lang === 'hi' ? 'बाकी (DUE)' : 'DUE'}
                      </span>
                    )}
                  </div>
                  <div className='text-xs text-[#64748b] mt-0.5'>
                    {hasFee ? (lang === 'hi' ? 'जीएसटी (18%) सहित' : 'Inclusive of 18% GST') : (lang === 'hi' ? 'कोई शुल्क लागू नहीं' : 'No fee applicable')}
                  </div>
                </div>

                {/* Razorpay Transaction / Receipt Ref */}
                <div className='rounded-2xl border border-[#f1f5f9] bg-[#faf8f5] p-4 shadow-2xs'>
                  <div className='flex items-center gap-2 text-xs font-bold text-[#64748b] uppercase tracking-wider'>
                    <FileTextIcon className='size-4 text-[#d8891d]' />
                    <span>{lang === 'hi' ? 'पेमेंट संदर्भ ID' : 'Transaction Reference'}</span>
                  </div>
                  <div className='mt-1.5 font-mono text-xs sm:text-sm font-bold text-[#0c2847] truncate'>
                    {details?.razorpayPaymentId || (hasFee && isPaymentSuccess ? 'Confirmed' : '—')}
                  </div>
                  <div className='text-xs text-[#64748b] mt-0.5'>
                    {details?.paidAt
                      ? new Date(details.paidAt).toLocaleDateString('en-IN')
                      : hasFee
                        ? (lang === 'hi' ? 'ऑनलाइन गेटवे भुगतान' : 'Online Gateway Payment')
                        : (lang === 'hi' ? 'निःशुल्क श्रेणी' : 'Non-Fee Category')}
                  </div>
                </div>
              </div>
            </div>

            {/* WHAT HAPPENS NEXT: Visual Progress Stepper */}
            <div className='mt-8 pt-6 border-t border-[#f1f5f9]'>
              <h2 className='text-xs font-black uppercase tracking-wider text-[#64748b] mb-4'>
                {lang === 'hi' ? 'आगे की प्रक्रिया (What Happens Next)' : 'What Happens Next'}
              </h2>

              <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
                {/* Step 1 */}
                <div className='relative rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4'>
                  <div className='flex items-center gap-2'>
                    <div className='flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs'>
                      ✓
                    </div>
                    <span className='text-xs font-extrabold text-emerald-900 uppercase'>
                      {lang === 'hi' ? 'चरण 1: संपन्न' : 'Step 1: Done'}
                    </span>
                  </div>
                  <div className='mt-2 text-sm font-bold text-[#0c2847]'>
                    {lang === 'hi' ? 'आवेदन व शुल्क प्राप्त' : 'Application Received'}
                  </div>
                  <div className='mt-1 text-xs text-[#64748b] leading-relaxed'>
                    {lang === 'hi'
                      ? 'आपका आवेदन बोर्ड के डेटाबेस में सुरक्षित दर्ज हो चुका है।'
                      : 'Your application is securely saved in the board records.'}
                  </div>
                </div>

                {/* Step 2 */}
                <div className='relative rounded-2xl border border-[#eeddb8] bg-[#fdfaf5] p-4'>
                  <div className='flex items-center gap-2'>
                    <div className='flex size-6 items-center justify-center rounded-full bg-[#d8891d] text-white text-xs font-bold shadow-2xs'>
                      2
                    </div>
                    <span className='text-xs font-extrabold text-[#8c5711] uppercase'>
                      {lang === 'hi' ? 'चरण 2: आगामी' : 'Step 2: Next'}
                    </span>
                  </div>
                  <div className='mt-2 text-sm font-bold text-[#0c2847]'>
                    {lang === 'hi' ? 'दस्तावेज़ एवं पात्रता जांच' : 'Document Scrutiny'}
                  </div>
                  <div className='mt-1 text-xs text-[#64748b] leading-relaxed'>
                    {lang === 'hi'
                      ? 'विभागीय समिति द्वारा अपलोड किए गए प्रमाण-पत्रों की जांच की जाएगी।'
                      : 'Committee verifies uploaded documents and eligibility.'}
                  </div>
                </div>

                {/* Step 3 */}
                <div className='relative rounded-2xl border border-[#e2e8f0] bg-white p-4'>
                  <div className='flex items-center gap-2'>
                    <div className='flex size-6 items-center justify-center rounded-full bg-[#94a3b8] text-white text-xs font-bold'>
                      3
                    </div>
                    <span className='text-xs font-extrabold text-[#64748b] uppercase'>
                      {lang === 'hi' ? 'चरण 3' : 'Step 3'}
                    </span>
                  </div>
                  <div className='mt-2 text-sm font-bold text-[#0c2847]'>
                    {lang === 'hi' ? 'बूथ आबंटन / ड्रॉ' : 'Allotment / Draw'}
                  </div>
                  <div className='mt-1 text-xs text-[#64748b] leading-relaxed'>
                    {lang === 'hi'
                      ? 'श्रेणी अनुसार पारदर्शी ड्रॉ या सीधा आबंटन किया जाएगा।'
                      : 'Allotment conducted through provably fair draw or direct review.'}
                  </div>
                </div>

                {/* Step 4 */}
                <div className='relative rounded-2xl border border-[#e2e8f0] bg-white p-4'>
                  <div className='flex items-center gap-2'>
                    <div className='flex size-6 items-center justify-center rounded-full bg-[#94a3b8] text-white text-xs font-bold'>
                      4
                    </div>
                    <span className='text-xs font-extrabold text-[#64748b] uppercase'>
                      {lang === 'hi' ? 'चरण 4' : 'Step 4'}
                    </span>
                  </div>
                  <div className='mt-2 text-sm font-bold text-[#0c2847]'>
                    {lang === 'hi' ? 'आबंटन पत्र व पज़ेशन' : 'Allotment Letter'}
                  </div>
                  <div className='mt-1 text-xs text-[#64748b] leading-relaxed'>
                    {lang === 'hi'
                      ? 'चयनित आवेदकों को SMS/WhatsApp और पत्र जारी होगा।'
                      : 'Selected applicants download signed allotment letter.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className='mt-8 pt-6 border-t border-[#f1f5f9] flex flex-col sm:flex-row items-center justify-between gap-3'>
              <Link
                href='/'
                className='inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-5 py-3 text-sm font-bold text-[#0c2847] shadow-2xs hover:bg-[#f8fafc] transition'
              >
                <HomeIcon className='size-4' />
                <span>{lang === 'hi' ? 'मुख्य पृष्ठ पर जाएं (Home)' : 'Return to Home'}</span>
              </Link>

              <Link
                href='/status'
                className='inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#0c2847] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#06192e] transition active:scale-95'
              >
                <ClockIcon className='size-4 text-[#f59e0b]' />
                <span>{lang === 'hi' ? 'आवेदन स्थिति ट्रैक करें' : 'Track Application Status'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* OFFICIAL HELPDESK & IMPORTANT ADVISORY CARD */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {/* Support & Contact Details */}
          <div className='rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-xs'>
            <div className='flex items-center gap-2.5 text-[#0c2847] mb-3'>
              <HelpCircleIcon className='size-5 text-[#d8891d]' />
              <h2 className='text-base font-bold text-[#0c2847]'>
                {lang === 'hi' ? 'सहायता केंद्र एवं संपर्क (Helpdesk)' : 'Helpdesk & Support'}
              </h2>
            </div>
            <p className='text-xs text-[#64748b] leading-relaxed mb-4'>
              {lang === 'hi'
                ? 'यदि आपको अपने आवेदन, दस्तावेज़ सत्यापन या शुल्क रसीद से संबंधित कोई प्रश्न है, तो हेल्पलाइन पर संपर्क करें:'
                : 'For any queries regarding your application, scrutiny, or receipt, please contact our helpline:'}
            </p>
            <div className='space-y-2 text-xs'>
              <div className='flex items-center gap-2 text-[#334155]'>
                <span className='font-bold text-[#0c2847]'>{lang === 'hi' ? 'हेल्पलाइन नंबर:' : 'Helpline:'}</span>
                <a href='tel:01744259503' className='font-mono font-bold text-[#0c2847] hover:underline'>
                  01744-259503
                </a>
              </div>
              <div className='flex items-center gap-2 text-[#334155]'>
                <span className='font-bold text-[#0c2847]'>{lang === 'hi' ? 'आधिकारिक ईमेल:' : 'Email:'}</span>
                <a href='mailto:kdb.allotment@gmail.com' className='font-semibold text-[#0c2847] hover:underline'>
                  kdb.allotment@gmail.com
                </a>
              </div>
              <div className='flex items-start gap-2 text-[#334155] pt-1'>
                <span className='font-bold text-[#0c2847] shrink-0'>{lang === 'hi' ? 'कार्यालय पता:' : 'Office:'}</span>
                <span className='text-[#64748b]'>
                  {lang === 'hi'
                    ? 'कुरुक्षेत्र विकास बोर्ड, ब्रह्म सरोवर, कुरुक्षेत्र, हरियाणा - 136118'
                    : 'Kurukshetra Development Board, Brahma Sarovar, Kurukshetra, Haryana - 136118'}
                </span>
              </div>
            </div>
          </div>

          {/* Important Advisory */}
          <div className='rounded-3xl border border-amber-200/80 bg-[#fffdfa] p-6 shadow-xs'>
            <div className='flex items-center gap-2.5 text-[#8c5711] mb-3'>
              <ShieldAlertIcon className='size-5 text-[#d8891d]' />
              <h2 className='text-base font-bold text-[#8c5711]'>
                {lang === 'hi' ? 'महत्वपूर्ण चेतावनी एवं निर्देश' : 'Important Advisory'}
              </h2>
            </div>
            <ul className='space-y-2 text-xs text-[#786348] leading-relaxed list-disc list-inside'>
              <li>
                {lang === 'hi'
                  ? 'किसी भी अनधिकृत व्यक्ति या दलाल के बहकावे में न आएं। आबंटन प्रक्रिया पूर्णतः नियमानुसार होगी।'
                  : 'Beware of touts or unauthorized agents. The allotment is governed strictly by official guidelines.'}
              </li>
              <li>
                {lang === 'hi'
                  ? 'दस्तावेज़ों में किसी भी विसंगति पर आवेदक को पोर्टल के माध्यम से सूचित किया जाएगा।'
                  : 'Any document discrepancy will be flagged and notified directly through this portal.'}
              </li>
              <li>
                {lang === 'hi'
                  ? 'आबंटन परिणाम एवं ड्रॉ की सूचना पंजीकृत व्हाट्सएप/एसएमएस पर भेजी जाएगी।'
                  : 'Allotment results and draw notices will be communicated via registered SMS/WhatsApp.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuccessPageView
