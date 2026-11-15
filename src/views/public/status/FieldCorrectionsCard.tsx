'use client'

import { useState } from 'react'

import { Loader2Icon, PencilLineIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Language } from '@/context/LanguageContext'

export type FieldQueryForApplicant = {
  id: number
  fieldKey: string
  label: string
  labelHi: string | null
  remarks: string
  inputType: 'text' | 'textarea' | 'select' | 'radio' | 'multiselect'
  options: Array<{ value: string; label: string }>
  maxLength: number
  currentValue: string
}

type Props = {
  applicationId: number
  accessToken: string | null
  queries: FieldQueryForApplicant[]
  lang: Language

  /** Called after a successful save so the page can reload the status. */
  onSaved: () => Promise<void> | void
}

/**
 * Lets the applicant correct the specific fields a reviewer raised a query
 * on. Only those fields are shown and only those can be submitted — the
 * server independently checks each one has an open query on this
 * application and validates it with the same rules as the apply form.
 */
const FieldCorrectionsCard = ({ applicationId, accessToken, queries, lang, onSaved }: Props) => {
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(queries.map(q => [q.id, q.currentValue]))
  )

  const [errorQueryId, setErrorQueryId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const hi = lang === 'hi'

  const setValue = (id: number, value: string) => setValues(prev => ({ ...prev, [id]: value }))

  const toggleMulti = (id: number, option: string, checked: boolean) => {
    const current = (values[id] ?? '').split(',').filter(Boolean)
    const next = checked ? [...new Set([...current, option])] : current.filter(v => v !== option)

    setValue(id, next.join(','))
  }

  const submit = async () => {
    setError(null)
    setErrorQueryId(null)

    if (!accessToken) {
      setError(hi ? 'सत्र समाप्त हो गया। कृपया पेज रीफ़्रेश करके दोबारा सत्यापित करें।' : 'Your session has expired. Please refresh and verify again.')

      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/applications/${applicationId}/field-queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ answers: queries.map(q => ({ queryId: q.id, value: values[q.id] ?? '' })) })
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrorQueryId(typeof body.queryId === 'number' ? body.queryId : null)
        setError(
          response.status === 401
            ? hi
              ? 'सत्र समाप्त हो गया। कृपया पेज रीफ़्रेश करके दोबारा सत्यापित करें।'
              : 'Your session has expired. Please refresh and verify again.'
            : (body.error ?? (hi ? 'सहेजा नहीं जा सका। कृपया पुनः प्रयास करें।' : 'Could not save. Please try again.'))
        )

        return
      }

      await onSaved()
    } catch {
      setError(hi ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div id='field-corrections' className='scroll-mt-4 overflow-hidden rounded-xl border border-amber-300 bg-white shadow-xs'>
      <div className='flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-5'>
        <PencilLineIcon className='size-4 text-amber-700' />
        <h2 className='text-sm font-bold text-amber-950'>{hi ? 'अपना विवरण सुधारें' : 'Correct Your Details'}</h2>
      </div>

      <div className='flex flex-col gap-5 p-4 sm:p-5'>
        {queries.map(q => {
          const label = hi && q.labelHi ? q.labelHi : q.label
          const inputId = `field-query-${q.id}`
          const hasError = errorQueryId === q.id

          return (
            <Field key={q.id} data-invalid={hasError}>
              <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
              <p className='-mt-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900'>
                <span className='font-semibold'>{hi ? 'समीक्षक की टिप्पणी:' : 'Reviewer’s note:'}</span> {q.remarks}
              </p>

              {(q.inputType === 'select' || q.inputType === 'radio') && (
                <select
                  id={inputId}
                  value={values[q.id] ?? ''}
                  onChange={e => setValue(q.id, e.target.value)}
                  aria-invalid={hasError}
                  className='h-10 w-full rounded-md border border-input bg-white px-3 text-sm'
                >
                  <option value=''>{hi ? '— चुनें —' : '— Select —'}</option>
                  {q.options.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}

              {q.inputType === 'multiselect' && (
                <div id={inputId} className='flex flex-col gap-1.5'>
                  {q.options.map(o => (
                    <label key={o.value} className='flex items-center gap-2 text-sm'>
                      <input
                        type='checkbox'
                        checked={(values[q.id] ?? '').split(',').includes(o.value)}
                        onChange={e => toggleMulti(q.id, o.value, e.target.checked)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              )}

              {q.inputType === 'textarea' && (
                <Textarea
                  id={inputId}
                  value={values[q.id] ?? ''}
                  onChange={e => setValue(q.id, e.target.value)}
                  maxLength={q.maxLength}
                  rows={3}
                  aria-invalid={hasError}
                />
              )}

              {q.inputType === 'text' && (
                <Input
                  id={inputId}
                  value={values[q.id] ?? ''}
                  onChange={e => setValue(q.id, e.target.value)}
                  maxLength={q.maxLength}
                  aria-invalid={hasError}
                />
              )}
            </Field>
          )
        })}

        {error && (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type='button' onClick={submit} disabled={isSaving} className='h-11 font-semibold'>
          {isSaving && <Loader2Icon className='animate-spin' />}
          {hi ? 'सुधार जमा करें' : 'Submit Corrections'}
        </Button>
      </div>
    </div>
  )
}

export default FieldCorrectionsCard
