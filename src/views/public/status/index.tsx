'use client'

import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, SearchIcon, UploadIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'

const lookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')
    .regex(/^KDB-\d{4}-\d{6}$/, 'Enter a valid application number, e.g. KDB-2026-123456'),
  accessToken: z.string().trim().min(1, 'Access code is required')
})

type LookupValues = z.infer<typeof lookupSchema>

type DocumentRow = {
  documentKey: string
  label: string
  verificationStatus: string | null
  verificationRemarks: string | null
  originalFilename: string | null
}

type StatusResult = {
  applicationId: number
  status: string
  categoryName: string
  submittedAt: string | null
  documents: DocumentRow[]
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  payment_pending: 'Payment Pending',
  payment_failed: 'Payment Failed',
  payment_success: 'Payment Received',
  under_review: 'Under Review',
  rejected: 'Rejected',
  selected: 'Selected',
  not_selected: 'Not Selected',
  payment_required: 'Payment Required',
  allotted: 'Allotted',
  cancelled: 'Cancelled',
  re_allotted: 'Re-Allotted'
}

type Phase = 'lookup' | 'otp' | 'result'

const StatusLookup = () => {
  const [phase, setPhase] = useState<Phase>('lookup')
  const [credentials, setCredentials] = useState<LookupValues | null>(null)
  const [maskedMobile, setMaskedMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [result, setResult] = useState<StatusResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '', accessToken: '' }
  })

  // Phase 1: app number + access code alone only requests a WhatsApp OTP to
  // the mobile number on file — it never returns status by itself.
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
        setError(body.error ?? 'Something went wrong. Please try again.')

        return
      }

      setCredentials(values)
      setMaskedMobile(body.maskedMobile)
      setOtpCode('')
      setPhase('otp')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Phase 2: app number + access code + the 6-digit code returns status/documents.
  const verifyOtpAndFetchStatus = async () => {
    if (!credentials) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/applications/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, otpCode })
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? 'Something went wrong. Please try again.')

        return
      }

      setResult(body)
      setPhase('result')
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const respondToQuery = async (documentKey: string, file: File) => {
    if (!credentials || !result) return

    setUploadMessage(null)
    setUploadingKey(documentKey)

    try {
      const formData = new FormData()

      formData.append('documentKey', documentKey)
      formData.append('file', file)

      const response = await fetch(`/api/applications/${result.applicationId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        body: formData
      })

      const body = await response.json()

      if (!response.ok) {
        setUploadMessage(body.error ?? 'Could not upload the file. Please try again.')

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
      setUploadMessage('Uploaded. It will be reviewed again shortly.')
    } catch {
      setUploadMessage('Could not reach the server. Please check your connection and try again.')
    } finally {
      setUploadingKey(null)
    }
  }

  const documentsNeedingResponse = result?.documents.filter(doc => doc.verificationStatus === 'query') ?? []

  return (
    <div className='mx-auto max-w-lg px-4 py-16 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>Check Application Status</h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {phase === 'otp'
          ? `Enter the 6-digit code sent to your WhatsApp number ending ${maskedMobile.slice(-4)}.`
          : 'Enter your application number and the access code you received on submission.'}
      </p>

      {phase === 'lookup' && (
        <form onSubmit={form.handleSubmit(requestOtpForLookup)} className='flex flex-col gap-4'>
          <Controller
            name='applicationNumber'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Application Number</FieldLabel>
                <Input {...field} id={field.name} placeholder='KDB-2026-123456' aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='accessToken'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Access Code</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
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
            Send Verification Code
          </Button>
        </form>
      )}

      {phase === 'otp' && (
        <div className='flex flex-col gap-4'>
          <Field>
            <FieldLabel htmlFor='otpCode'>6-Digit Code</FieldLabel>
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
            Verify & Check Status
          </Button>

          <button
            type='button'
            className='text-sm text-[var(--kdb-muted)] underline underline-offset-2 hover:text-[var(--kdb-primary)]'
            disabled={isLoading}
            onClick={() => credentials && requestOtpForLookup(credentials)}
          >
            Resend code
          </button>

          <button
            type='button'
            className='text-sm text-[var(--kdb-muted)] underline underline-offset-2'
            onClick={() => {
              setPhase('lookup')
              setError(null)
            }}
          >
            Use a different application number
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className='flex flex-col gap-4'>
          <div className='rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6'>
            <p className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Category</p>
            <p className='mb-4 font-semibold text-[var(--kdb-primary)]'>{result.categoryName}</p>

            <p className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Status</p>
            <p className='font-semibold text-[var(--kdb-primary)]'>{STATUS_LABEL[result.status] ?? result.status}</p>
          </div>

          {documentsNeedingResponse.length > 0 && (
            <div className='rounded-xl border border-amber-200 bg-amber-50 p-6'>
              <p className='mb-1 text-sm font-bold text-amber-900'>Documents Needing Your Response</p>
              <p className='mb-4 text-xs text-amber-800'>
                The verification team has asked for a corrected or additional document below.
              </p>

              <div className='flex flex-col gap-3'>
                {documentsNeedingResponse.map(doc => (
                  <div key={doc.documentKey} className='rounded-lg border border-amber-200 bg-white p-3'>
                    <p className='text-sm font-semibold text-[var(--kdb-primary)]'>{doc.label}</p>
                    {doc.verificationRemarks && (
                      <p className='mt-1 text-xs text-amber-800'>&ldquo;{doc.verificationRemarks}&rdquo;</p>
                    )}

                    <label className='mt-3 flex w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted'>
                      {uploadingKey === doc.documentKey ? (
                        <Loader2Icon className='size-3.5 animate-spin' />
                      ) : (
                        <UploadIcon className='size-3.5' />
                      )}
                      Upload Corrected File
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
                ))}
              </div>

              {uploadMessage && (
                <p className='mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-900'>
                  <CheckCircle2Icon className='size-3.5' /> {uploadMessage}
                </p>
              )}
            </div>
          )}

          {result.documents.length > 0 && (
            <div className='rounded-xl border border-[var(--kdb-border)] p-6'>
              <p className='mb-3 text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Documents</p>
              <div className='flex flex-col gap-2'>
                {result.documents.map(doc => {
                  const cfg = doc.verificationStatus
                    ? getDocumentStatusConfig(doc.verificationStatus)
                    : { label: 'Not Uploaded', color: 'bg-gray-100 text-gray-700' }

                  return (
                    <div key={doc.documentKey} className='flex items-center justify-between text-sm'>
                      <span className='text-[var(--kdb-text)]'>{doc.label}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default StatusLookup
