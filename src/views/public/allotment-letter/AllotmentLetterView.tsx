'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircleIcon,
  CreditCardIcon,
  DownloadIcon,
  Loader2Icon,
  SearchIcon,
  StoreIcon
} from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'
import { downloadBlob } from '@/lib/browser/download-blob'

const lookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number, e.g. IGM-2026-123456')
})

type LookupValues = z.infer<typeof lookupSchema>

type StatusApiResponse = {
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
  submittedAt: string | null
}

type Phase = 'lookup' | 'otp' | 'result'

const AllotmentLetterView = () => {
  const { lang } = useLanguage()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('lookup')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otpWhatsappEnabled, setOtpWhatsappEnabled] = useState(true)
  const [otpCode, setOtpCode] = useState('')
  const [statusData, setStatusData] = useState<StatusApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '' }
  })

  useEffect(() => {
    const appNo = searchParams.get('appNo')

    if (appNo) {
      form.setValue('applicationNumber', appNo)
    }
  }, [searchParams, form])

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
        setError(body.error ?? (lang === 'hi' ? 'कुछ गलत हो गया।' : 'Something went wrong.'))
        return
      }

      setApplicationNumber(values.applicationNumber)
      setMaskedMobile(body.maskedMobile)
      setOtpWhatsappEnabled(body.whatsappEnabled !== false)
      setOtpCode('')
      setPhase('otp')
    } catch {
      setError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

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
        setError(body.error ?? (lang === 'hi' ? 'सत्यापन विफल रहा।' : 'Verification failed.'))
        return
      }

      setStatusData(body)
      setPhase('result')
    } catch {
      setError(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।'
          : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Same unified PDF (src/lib/allotment/allotment-letter-pdf.ts) that the
  // admin panel and the already-verified /status page download — ensures
  // this OTP-gated standalone page can never show different content.
  const downloadAllotmentLetter = async () => {
    if (!statusData) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      const headers: Record<string, string> = {}
      if (statusData.accessToken) {
        headers['Authorization'] = `Bearer ${statusData.accessToken}`
      }

      const response = await fetch(`/api/applications/${statusData.applicationId}/allotment-letter/pdf?lang=en`, {
        headers
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setDownloadError(
          body.error ?? (lang === 'hi' ? 'आवंटन पत्र डाउनलोड नहीं हो सका।' : 'Could not download the allotment letter.')
        )

        return
      }

      downloadBlob(await response.blob(), `Allotment-Letter-${applicationNumber}.pdf`)
    } catch {
      setDownloadError(
        lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className='mx-auto max-w-3xl px-4 py-10 sm:px-6'>
      <div className='print:hidden mb-6'>
        <h1 className='text-2xl font-extrabold text-[var(--kdb-primary)]'>
          {lang === 'hi' ? 'आबंटन पत्र (Allotment Letter)' : 'Stall Allotment Letter'}
        </h1>
        <p className='text-sm text-[var(--kdb-muted)] mt-1'>
          {lang === 'hi'
            ? 'गीता जयंती महोत्सव 2026 के लिए अपना आधिकारिक स्टॉल आबंटन पत्र देखें व डाउनलोड करें।'
            : 'Download and print your official Booth/Stall Allotment Letter for Gita Jayanti Mahotsav 2026.'}
        </p>
      </div>

      {phase === 'lookup' && (
        <div className='print:hidden max-w-xl rounded-xl border border-[var(--kdb-border)] bg-white p-6 shadow-xs'>
          <form onSubmit={form.handleSubmit(requestOtpForLookup)} className='flex flex-col gap-4'>
            <Controller
              name='applicationNumber'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    {lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number'}
                  </FieldLabel>
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

            <Button type='submit' disabled={isLoading} className='bg-[var(--kdb-primary)] hover:bg-[#071a2f] text-white'>
              {isLoading ? <Loader2Icon className='animate-spin' /> : <SearchIcon />}
              {lang === 'hi' ? 'सत्यापन कोड भेजें' : 'Send Verification Code'}
            </Button>
          </form>
        </div>
      )}

      {phase === 'otp' && (
        <div className='print:hidden max-w-xl rounded-xl border border-[var(--kdb-border)] bg-white p-6 shadow-xs flex flex-col gap-4'>
          <p className='text-xs text-[var(--kdb-muted)]'>
            {otpWhatsappEnabled
              ? lang === 'hi'
                ? `आपके व्हाट्सएप नंबर (...${(maskedMobile || '').slice(-4)}) पर भेजा गया 6-अंकों का कोड दर्ज करें:`
                : `Enter the 6-digit code sent to your WhatsApp number ending ${(maskedMobile || '').slice(-4)}:`
              : lang === 'hi'
                ? `आपके मोबाइल नंबर (...${(maskedMobile || '').slice(-4)}) से जुड़े ईमेल पर भेजा गया 6-अंकों का कोड दर्ज करें:`
                : `Enter the 6-digit code emailed to the address linked to your mobile number ending ${(maskedMobile || '').slice(-4)}:`}
          </p>

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
            className='bg-[var(--kdb-primary)] hover:bg-[#071a2f] text-white'
          >
            {isLoading && <Loader2Icon className='animate-spin' />}
            {lang === 'hi' ? 'सत्यापित करें और आबंटन पत्र देखें' : 'Verify & View Allotment Letter'}
          </Button>

          <button
            type='button'
            className='text-xs text-[var(--kdb-muted)] underline'
            onClick={() => {
              setPhase('lookup')
              setError(null)
            }}
          >
            {lang === 'hi' ? 'भिन्न आवेदन क्रमांक दर्ज करें' : 'Use a different application number'}
          </button>
        </div>
      )}

      {phase === 'result' && statusData && (
        <div>
          {/* If status is payment_required */}
          {statusData.status === 'payment_required' && (
            <div className='print:hidden mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-6'>
              <div className='flex items-start gap-4'>
                <div className='rounded-full bg-amber-500 p-2 text-white shrink-0'>
                  <StoreIcon className='size-6' />
                </div>
                <div>
                  <h3 className='text-base font-bold text-amber-950'>
                    {lang === 'hi'
                      ? 'आबंटन शुल्क का भुगतान आवश्यक है'
                      : 'Allotment Fee Payment Required'}
                  </h3>
                  <p className='mt-1 text-xs text-amber-900 leading-relaxed'>
                    {lang === 'hi'
                      ? 'आपका स्टॉल आबंटन पत्र तभी जारी होगा जब आप अपना निर्धारित आबंटन शुल्क जमा कर देंगे।'
                      : 'Your official allotment letter will be unlocked once your allotment fee is paid.'}
                  </p>
                  <div className='mt-4'>
                    <Link
                      href={`/status?appNo=${encodeURIComponent(applicationNumber)}`}
                      className='inline-flex items-center gap-2 rounded-lg bg-[#0c2847] hover:bg-[#071a2f] text-white px-4 py-2 text-xs font-bold'
                    >
                      <CreditCardIcon className='size-4' />
                      {lang === 'hi' ? 'स्थिति पृष्ठ पर जाकर भुगतान करें' : 'Go to Status Page to Pay Now'}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* If status is NOT allotted and NOT payment_required */}
          {statusData.status !== 'allotted' && statusData.status !== 'payment_required' && (
            <div className='print:hidden mb-6 rounded-xl border border-slate-300 bg-white p-6'>
              <h3 className='text-base font-bold text-[#0c2847]'>
                {lang === 'hi' ? 'आबंटन अभी पूर्ण नहीं हुआ है' : 'Allotment Incomplete'}
              </h3>
              <p className='mt-1 text-xs text-muted-foreground'>
                {lang === 'hi'
                  ? `आपके आवेदन की वर्तमान स्थिति "${statusData.status}" है। आबंटन पत्र केवल आबंटित (Allotted) आवेदनों के लिए जारी किया जाता है।`
                  : `Your application is currently "${statusData.status}". Allotment letters are only issued once a booth/stall has been allotted.`}
              </p>
              <div className='mt-4'>
                <Link
                  href={`/status?appNo=${encodeURIComponent(applicationNumber)}`}
                  className='text-xs font-bold text-[var(--kdb-primary)] underline'
                >
                  {lang === 'hi' ? 'आवेदन की विस्तृत स्थिति देखें' : 'View full application status'}
                </Link>
              </div>
            </div>
          )}

          {/* If status is allotted: offer the official PDF download */}
          {statusData.status === 'allotted' && statusData.stallNumber && (
            <div className='rounded-xl border border-slate-200 bg-white p-6'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='text-xs text-muted-foreground'>
                    {lang === 'hi' ? 'आबंटित स्टॉल:' : 'Allotted Stall:'}{' '}
                    <span className='font-bold text-[#0c2847]'>{statusData.stallNumber}</span>
                  </p>
                  <p className='text-xs font-semibold text-emerald-700'>
                    {lang === 'hi' ? '✓ आबंटन पत्र तैयार है' : '✓ Allotment letter is ready'}
                  </p>
                </div>
                <Button
                  onClick={downloadAllotmentLetter}
                  disabled={isDownloading}
                  className='bg-[#0c2847] hover:bg-[#071a2f] text-white text-xs font-bold gap-2'
                >
                  {isDownloading ? <Loader2Icon className='size-4 animate-spin' /> : <DownloadIcon className='size-4' />}
                  {lang === 'hi' ? 'आवंटन पत्र डाउनलोड करें' : 'Download Allotment Letter'}
                </Button>
              </div>

              {downloadError && (
                <Alert variant='destructive' className='mt-4'>
                  <AlertCircleIcon className='size-4' />
                  <AlertDescription>{downloadError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AllotmentLetterView
