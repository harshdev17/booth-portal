'use client'

import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const lookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')
    .regex(/^KDB-\d{4}-\d{6}$/, 'Enter a valid application number, e.g. KDB-2026-123456'),
  accessToken: z.string().trim().min(1, 'Access code is required')
})

type LookupValues = z.infer<typeof lookupSchema>

type StatusResult = { status: string; categoryName: string; submittedAt: string | null }

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

const StatusLookup = () => {
  const [result, setResult] = useState<StatusResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { applicationNumber: '', accessToken: '' }
  })

  const onSubmit = async (values: LookupValues) => {
    setError(null)
    setResult(null)
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

      setResult(body)
    } catch {
      setError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='mx-auto max-w-lg px-4 py-16 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>Check Application Status</h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        Enter your application number and the access code you received on submission.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
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
          Check Status
        </Button>
      </form>

      {result && (
        <div className='mt-8 rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6'>
          <p className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Category</p>
          <p className='mb-4 font-semibold text-[var(--kdb-primary)]'>{result.categoryName}</p>

          <p className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Status</p>
          <p className='font-semibold text-[var(--kdb-primary)]'>{STATUS_LABEL[result.status] ?? result.status}</p>
        </div>
      )}
    </div>
  )
}

export default StatusLookup
