'use client'

import { useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, SearchIcon, UploadIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'

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
  status: string
  categoryName: string
  categoryNameHi: string | null
  submittedAt: string | null
  documents: DocumentRow[]
}

const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  draft: { en: 'Draft', hi: 'ड्राफ्ट' },
  payment_pending: { en: 'Payment Pending', hi: 'भुगतान लंबित' },
  payment_failed: { en: 'Payment Failed', hi: 'भुगतान विफल' },
  payment_success: { en: 'Payment Received', hi: 'भुगतान प्राप्त' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  query_raised: { en: 'Query Raised', hi: 'स्पष्टीकरण आवश्यक' },
  rejected: { en: 'Rejected', hi: 'अस्वीकृत' },
  selected: { en: 'Selected', hi: 'चयनित' },
  not_selected: { en: 'Not Selected', hi: 'चयनित नहीं' },
  payment_required: { en: 'Payment Required', hi: 'भुगतान आवश्यक' },
  allotted: { en: 'Allotted', hi: 'आवंटित' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आवंटित' }
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
  under_review: { en: 'Your application and documents are being reviewed.', hi: 'आपके आवेदन और दस्तावेज़ों की समीक्षा की जा रही है।' },
  query_raised: {
    en: 'The review team needs a corrected document. Please upload it below.',
    hi: 'समीक्षा टीम को सही दस्तावेज़ चाहिए। कृपया नीचे अपलोड करें।'
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
  const [reuploadedKeys, setReuploadedKeys] = useState<string[]>([])

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '' }
  })

  // Prefills from ?appNo=... when arriving via the homepage's status-check
  // search bar (StatusCheckSection.tsx), so the applicant isn't asked to
  // retype the number they already entered — reported live as a real
  // annoyance ("sahi bhi daalo to next page fir se daalne ka kehta hai").
  // Deliberately only prefills, doesn't auto-submit: the applicant should
  // still see and confirm the number before an OTP is sent.
  useEffect(() => {
    const appNo = searchParams.get('appNo')

    if (appNo) {
      form.setValue('applicationNumber', appNo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount against the initial query param only
  }, [])

  // Phase 1: application number alone only requests a WhatsApp OTP to the
  // mobile number on file — it never returns status by itself.
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

  // Phase 2: application number + the 6-digit code returns status/documents.
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
    setUploadingKey(documentKey)

    try {
      const formData = new FormData()

      formData.append('documentKey', documentKey)
      formData.append('file', file)

      // No access token to send — ownership here is proven by the OTP just
      // verified for this application's mobile number (server re-checks it
      // independently; see hasRecentVerifiedOtp in the documents route).
      const response = await fetch(`/api/applications/${result.applicationId}/documents`, {
        method: 'POST',
        body: formData
      })

      const body = await response.json()

      if (!response.ok) {
        setUploadMessage(body.error ?? (lang === 'hi' ? 'फ़ाइल अपलोड नहीं हो सकी। पुनः प्रयास करें।' : 'Could not upload the file. Please try again.'))

        return
      }

      // Reflect the response locally — re-fetching the authoritative status
      // would require another OTP, which isn't worth it for what the
      // server-side upload response already confirms happened.
      setResult(prev =>
        prev
          ? {
              ...prev,
              documents: prev.documents.map(doc =>
                doc.documentKey === documentKey
                  ? { ...doc, verificationStatus: 'pending', verificationRemarks: null, originalFilename: body.originalFilename }
                  : doc
              )
            }
          : prev
      )
      setReuploadedKeys(prev => [...prev, documentKey])
      setUploadMessage(lang === 'hi' ? 'अपलोड हो गया। शीघ्र ही पुनः समीक्षा की जाएगी।' : 'Uploaded. It will be reviewed again shortly.')
    } catch {
      setUploadMessage(
        lang === 'hi'
          ? 'सर्वर से संपर्क नहीं हो सका। कृपया अपना कनेक्शन जांचें।'
          : 'Could not reach the server. Please check your connection and try again.'
      )
    } finally {
      setUploadingKey(null)
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
        {lang === 'hi' ? 'आवेदन की स्थिति जांचें' : 'Check Application Status'}
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
              {result.submittedAt && (
                <div className='flex items-start justify-between gap-4 px-5 py-3'>
                  <dt className='text-[var(--kdb-muted)]'>{lang === 'hi' ? 'जमा करने की तिथि' : 'Submitted on'}</dt>
                  <dd className='text-right font-medium text-[var(--kdb-text)]'>
                    {new Date(result.submittedAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
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

          {uploadMessage && (
            <p className='text-xs font-medium text-[var(--kdb-text)]' role='status'>
              {uploadMessage}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default StatusLookup
