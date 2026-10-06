'use client'

import { useEffect, useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, DownloadIcon, Loader2Icon, PrinterIcon, SearchIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'
import { downloadBlob } from '@/lib/browser/download-blob'
import ApplicationPrintSheet, { type PrintResult } from '@/views/public/print-application/ApplicationPrintSheet'

const lookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/, 'Enter a valid application number, e.g. IGM-2026-123456')
})

type LookupValues = z.infer<typeof lookupSchema>

type Phase = 'lookup' | 'otp' | 'result'

const PrintApplication = () => {
  const { lang } = useLanguage()
  const [phase, setPhase] = useState<Phase>('lookup')
  const [applicationNumber, setApplicationNumber] = useState('')
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [result, setResult] = useState<PrintResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

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

  const downloadPdf = async () => {
    if (!result) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      const response = await fetch(
        `/api/applications/print/pdf?applicationNumber=${encodeURIComponent(result.applicationNumber)}&lang=${lang}`
      )

      if (!response.ok) {
        const body = await response.json()

        setDownloadError(
          body.error ?? (lang === 'hi' ? 'आवेदन डाउनलोड नहीं हो सका।' : 'Could not download the application.')
        )

        return
      }

      downloadBlob(await response.blob(), `Application-${result.applicationNumber}.pdf`)
    } catch {
      setDownloadError(
        lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

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

      {phase === 'result' && result && downloadError && (
        <Alert variant='destructive' className='mb-4 print:hidden'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {phase === 'result' && result && (
        <div className='flex flex-col gap-6 print:block print:gap-0'>
          <div className='flex flex-wrap gap-3 print:hidden'>
            <Button type='button' onClick={() => window.print()} className='w-fit'>
              <PrinterIcon />
              {lang === 'hi' ? 'प्रिंट करें' : 'Print'}
            </Button>
            <Button type='button' variant='outline' onClick={downloadPdf} disabled={isDownloading} className='w-fit'>
              {isDownloading ? <Loader2Icon className='animate-spin' /> : <DownloadIcon />}
              {lang === 'hi' ? 'पीडीएफ डाउनलोड करें' : 'Download PDF'}
            </Button>
          </div>

          {/*
            kdb-print-sheet: the ONLY thing visible when printed (see the
            @media print rule in (public)/public.css) — everything else on
            the page (site header, footer, this screen's own heading/intro,
            the Print button) is hidden so the output is a clean standalone
            document, not a screenshot of the website.
          */}
          <ApplicationPrintSheet result={result} lang={lang} />
        </div>
      )}
    </div>
  )
}

export default PrintApplication
