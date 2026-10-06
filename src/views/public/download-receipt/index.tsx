'use client'

import { useState } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircleIcon, DownloadIcon, Loader2Icon } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/LanguageContext'
import { downloadBlob } from '@/lib/browser/download-blob'

const schema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1, 'Application number is required')
    .regex(/^(?:IGM|KDB)-\d{4}-\d{6}$/i, 'Enter a valid application number, e.g. IGM-2026-123456'),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^(?:\+?91)?[6-9]\d{9}$/, 'Enter the 10-digit mobile number used in the application')
})

type Values = z.infer<typeof schema>

const DownloadReceipt = () => {
  const { lang } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { applicationNumber: '', mobileNumber: '' }
  })

  const onSubmit = async (values: Values) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/applications/receipt/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, lang })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setError(body.error ?? (lang === 'hi' ? 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।' : 'Something went wrong. Please try again.'))

        return
      }

      downloadBlob(await response.blob(), `Receipt-${values.applicationNumber.trim().toUpperCase()}.pdf`)
    } catch {
      setError(
        lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='mx-auto max-w-2xl px-4 py-16 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>
        {lang === 'hi' ? 'भुगतान रसीद डाउनलोड करें' : 'Download Payment Receipt'}
      </h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'अपना आवेदन क्रमांक और आवेदन में दिया गया मोबाइल नंबर दर्ज करें। किसी OTP की आवश्यकता नहीं है।'
          : 'Enter your application number and the mobile number used in the application. No OTP needed.'}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
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
        <Controller
          name='mobileNumber'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'}</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type='tel'
                inputMode='numeric'
                placeholder='9876543210'
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {error && (
          <Alert variant='destructive'>
            <AlertCircleIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type='submit' disabled={isLoading}>
          {isLoading ? <Loader2Icon className='animate-spin' /> : <DownloadIcon />}
          {lang === 'hi' ? 'रसीद डाउनलोड करें' : 'Download Receipt'}
        </Button>
      </form>
    </div>
  )
}

export default DownloadReceipt
