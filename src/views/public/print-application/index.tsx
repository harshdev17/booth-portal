'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, Loader2Icon, PrinterIcon, SearchIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'

const lookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number, e.g. IGM-2026-123456')
})

type LookupValues = z.infer<typeof lookupSchema>

type FieldValue = { label: string; labelHi: string | null; value: string }

type PrintResult = {
  applicationNumber: string
  status: string
  categoryName: string
  categoryNameHi: string | null
  shopOptionLabel: string | null
  feePaise: number | null
  submittedAt: string | null
  organisationName: string
  representativeName: string
  fatherName: string
  aadhaarNumber: string
  email: string
  mobileNumber: string
  alternateMobile: string | null
  address: string
  state: string
  district: string
  pinCode: string
  workPurpose: string
  achievementExperience: string
  remarks: string | null
  fieldValues: FieldValue[]
}

type Phase = 'lookup' | 'otp' | 'result'

const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

// Same bilingual status vocabulary as the Check Application Status page
// (views/public/status/index.tsx) — kept as a local copy rather than a
// shared import since each page's status list isn't guaranteed to diverge
// together, and this one only needs it for the printed summary's header line.
const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  draft: { en: 'Draft', hi: 'ड्राफ्ट' },
  payment_pending: { en: 'Payment Pending', hi: 'भुगतान लंबित' },
  payment_failed: { en: 'Payment Failed', hi: 'भुगतान विफल' },
  payment_success: { en: 'Payment Received', hi: 'भुगतान प्राप्त' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  rejected: { en: 'Rejected', hi: 'अस्वीकृत' },
  selected: { en: 'Selected', hi: 'चयनित' },
  not_selected: { en: 'Not Selected', hi: 'चयनित नहीं' },
  payment_required: { en: 'Payment Required', hi: 'भुगतान आवश्यक' },
  allotted: { en: 'Allotted', hi: 'आवंटित' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आवंटित' }
}

const PrintApplication = () => {
  const { lang } = useLanguage()
  const [phase, setPhase] = useState<Phase>('lookup')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [result, setResult] = useState<PrintResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '' }
  })

  // Browsers use the page's <title> as the suggested filename for "Save as
  // PDF" from the print dialog — this is the only way to influence that
  // filename from JS (there is no API to set it directly). Restored on
  // unmount so navigating elsewhere doesn't leave the tab title changed.
  useEffect(() => {
    if (!result) return

    const previousTitle = document.title

    document.title = `Application-${result.applicationNumber}`

    return () => {
      document.title = previousTitle
    }
  }, [result])

  const requestOtpForLookup = async (values: LookupValues) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/applications/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? (lang === 'hi' ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।' : 'Something went wrong. Please try again.'))

        return
      }

      setApplicationNumber(values.applicationNumber)
      setMaskedMobile(body.maskedMobile)
      setOtpCode('')
      setPhase('otp')
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

  const verifyOtpAndFetchApplication = async () => {
    if (!applicationNumber) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/applications/print', {
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

  return (
    <div className='kdb-print-sheet-page mx-auto max-w-2xl px-4 py-16 sm:px-6 print:max-w-none print:p-0'>
      <div className='print:hidden'>
        <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>
          {lang === 'hi' ? 'आवेदन प्रिंट करें' : 'Print Application'}
        </h1>
        <p className='mb-8 text-[var(--kdb-muted)]'>
          {phase === 'otp'
            ? lang === 'hi'
              ? `आपके व्हाट्सएप नंबर पर भेजा गया 6-अंकों का कोड दर्ज करें (...${maskedMobile.slice(-4)})।`
              : `Enter the 6-digit code sent to your WhatsApp number ending ${maskedMobile.slice(-4)}.`
            : lang === 'hi'
              ? 'अपना आवेदन क्रमांक दर्ज करें। हम आपके पंजीकृत मोबाइल नंबर पर एक सत्यापन कोड भेजेंगे।'
              : "Enter your application number. We'll send a verification code to your registered mobile number."}
        </p>
      </div>

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

          <Button type='button' disabled={isLoading || otpCode.length !== 6} onClick={verifyOtpAndFetchApplication}>
            {isLoading && <Loader2Icon className='animate-spin' />}
            {lang === 'hi' ? 'सत्यापित करें और आवेदन देखें' : 'Verify & View Application'}
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
        <div className='flex flex-col gap-6 print:block print:gap-0'>
          <Button type='button' onClick={() => window.print()} className='w-fit print:hidden'>
            <PrinterIcon />
            {lang === 'hi' ? 'प्रिंट करें' : 'Print'}
          </Button>

          {/*
            kdb-print-sheet: the ONLY thing visible when printed (see the
            @media print rule in (public)/public.css) — everything else on
            the page (site header, footer, this screen's own heading/intro,
            the Print button) is hidden so the output is a clean standalone
            document, not a screenshot of the website. Fixed black-on-white
            colors here are deliberate, not the site's --kdb-* theme
            variables — many browsers' print/PDF engines don't reliably
            apply custom-property-based or light/tinted colors unless the
            user explicitly enables "background graphics", which most people
            leave off, so a real printout came out with invisible/near-white
            text before this fix.
          */}
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
                {lang === 'hi' ? 'आवेदन सारांश' : 'Application Summary'}
              </h3>
              <span className='rounded-full border border-black px-3 py-1 text-xs font-bold text-black'>
                {lang === 'hi' ? (STATUS_LABEL[result.status]?.hi ?? result.status) : (STATUS_LABEL[result.status]?.en ?? result.status)}
              </span>
            </div>

            <dl className='grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2'>
              <SummaryRow label={lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number'} value={result.applicationNumber} />
              <SummaryRow
                label={lang === 'hi' ? 'श्रेणी' : 'Category'}
                value={lang === 'hi' ? (result.categoryNameHi ?? result.categoryName) : result.categoryName}
              />
              <SummaryRow label={lang === 'hi' ? 'संगठन/व्यक्ति का नाम' : 'Organisation / Applicant Name'} value={result.organisationName} />
              <SummaryRow label={lang === 'hi' ? 'प्रतिनिधि का नाम' : 'Representative Name'} value={result.representativeName} />
              <SummaryRow label={lang === 'hi' ? 'पिता का नाम' : "Father's Name"} value={result.fatherName} />
              <SummaryRow label={lang === 'hi' ? 'आधार संख्या' : 'Aadhaar Number'} value={result.aadhaarNumber} />
              <SummaryRow label={lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'} value={result.mobileNumber} />
              {result.alternateMobile && (
                <SummaryRow label={lang === 'hi' ? 'वैकल्पिक मोबाइल' : 'Alternate Mobile'} value={result.alternateMobile} />
              )}
              <SummaryRow label={lang === 'hi' ? 'ईमेल' : 'Email'} value={result.email} />
              <SummaryRow label={lang === 'hi' ? 'पता' : 'Address'} value={result.address} span />
              <SummaryRow label={lang === 'hi' ? 'राज्य' : 'State'} value={result.state} />
              <SummaryRow label={lang === 'hi' ? 'ज़िला' : 'District'} value={result.district} />
              <SummaryRow label={lang === 'hi' ? 'पिन कोड' : 'PIN Code'} value={result.pinCode} />
              {result.shopOptionLabel && (
                <SummaryRow label={lang === 'hi' ? 'बूथ/स्टॉल विकल्प' : 'Booth/Stall Option'} value={result.shopOptionLabel} />
              )}
              {result.feePaise !== null && (
                <SummaryRow label={lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee'} value={formatRupees(result.feePaise)} />
              )}
              <SummaryRow label={lang === 'hi' ? 'कार्य का उद्देश्य' : 'Purpose of Work'} value={result.workPurpose} span />
              <SummaryRow
                label={lang === 'hi' ? 'उपलब्धि/अनुभव' : 'Achievement / Experience'}
                value={result.achievementExperience}
                span
              />
              {result.remarks && <SummaryRow label={lang === 'hi' ? 'टिप्पणी' : 'Remarks'} value={result.remarks} span />}
              {result.fieldValues.map(fv => (
                <SummaryRow key={fv.label} label={lang === 'hi' ? (fv.labelHi ?? fv.label) : fv.label} value={fv.value} />
              ))}
              {result.submittedAt && (
                <SummaryRow
                  label={lang === 'hi' ? 'प्रस्तुत तिथि' : 'Submitted On'}
                  value={new Date(result.submittedAt).toLocaleString('en-IN')}
                />
              )}
            </dl>

            <div className='mt-10 flex items-end justify-between border-t border-black pt-4 text-xs text-black'>
              <p>
                {lang === 'hi'
                  ? 'यह एक कंप्यूटर-जनित दस्तावेज़ है और इसके लिए हस्ताक्षर की आवश्यकता नहीं है।'
                  : 'This is a computer-generated document and does not require a signature.'}
              </p>
              <p>{new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SummaryRow = ({ label, value, span }: { label: string; value: string; span?: boolean }) => (
  <div className={span ? 'sm:col-span-2' : undefined}>
    <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase print:text-black'>{label}</dt>
    <dd className='font-semibold text-[var(--kdb-primary)] break-words print:text-black'>{value}</dd>
  </div>
)

export default PrintApplication
