'use client'

import { useState } from 'react'
import { Loader2Icon, PencilLineIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  onSaved: () => Promise<void> | void
}

const FieldCorrectionsCard = ({ applicationId, accessToken, queries, lang, onSaved }: Props) => {
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(queries.map(q => [q.id, '']))
  )

  const [errorQueryId, setErrorQueryId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const hi = lang === 'hi'

  const setValue = (id: number, value: string) => {
    setError(null)
    setErrorQueryId(null)
    setValues(prev => ({ ...prev, [id]: value }))
  }

  const toggleMulti = (id: number, option: string, checked: boolean) => {
    const current = (values[id] ?? '').split(',').filter(Boolean)
    const next = checked ? [...new Set([...current, option])] : current.filter(v => v !== option)

    setValue(id, next.join(','))
  }

  const submit = async () => {
    setError(null)
    setErrorQueryId(null)

    if (!accessToken) {
      setError(
        hi
          ? 'सत्र समाप्त हो गया। कृपया पेज रीफ़्रेश करके दोबारा सत्यापित करें।'
          : 'Your session has expired. Please refresh and verify again.'
      )

      return
    }

    for (const q of queries) {
      const val = (values[q.id] ?? '').trim()
      const fieldName = hi && q.labelHi ? q.labelHi : q.label

      if (!val) {
        setErrorQueryId(q.id)
        setError(
          hi
            ? `कृपया "${fieldName}" के लिए नया सही विवरण भरें।`
            : `Please enter the new value for "${fieldName}".`
        )

        return
      }

      if (val === q.currentValue.trim()) {
        setErrorQueryId(q.id)
        setError(
          hi
            ? `"${fieldName}" का नया मान पुराने मान के समान ही है। कृपया सही सुधार भरें।`
            : `The new value for "${fieldName}" is identical to the current value. Please enter the corrected value.`
        )

        return
      }
    }

    setIsSaving(true)

    try {
      const response = await fetch(`/api/applications/${applicationId}/field-queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          answers: queries.map(q => ({ queryId: q.id, value: (values[q.id] ?? '').trim() })),
          notes: notes.trim() || undefined
        })
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
    <div id='field-corrections' className='scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs'>
      {/* Card Header */}
      <div className='border-b border-slate-200 px-5 py-3.5 bg-slate-50/60 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <PencilLineIcon className='size-4 text-[#0c2847]' />
          <h2 className='text-xs font-bold text-[#0c2847] uppercase tracking-wider'>
            {hi ? 'आवेदन विवरण में सुधार करें' : 'Correct Application Details'}
          </h2>
        </div>
        <span className='rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-[11px] font-semibold border border-amber-200'>
          {queries.length} {hi ? 'सुधार आवश्यक' : queries.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className='p-4 sm:p-5 flex flex-col gap-5'>
        {queries.map(q => {
          const label = hi && q.labelHi ? q.labelHi : q.label
          const inputId = `field-query-${q.id}`
          const hasError = errorQueryId === q.id

          return (
            <div
              key={q.id}
              className={`pb-5 border-b border-slate-100 last:border-b-0 last:pb-0 ${
                hasError ? 'rounded-lg bg-red-50/50 p-3' : ''
              }`}
            >
              <div className='flex items-center justify-between gap-2 mb-1'>
                <label className='text-sm font-semibold text-slate-900'>{label}</label>
              </div>

              {/* Reviewer Note */}
              <p className='text-xs text-amber-900 bg-amber-50/80 border border-amber-200/60 rounded px-2.5 py-1 mb-3'>
                <strong>{hi ? 'समीक्षक की टिप्पणी:' : 'Reviewer note:'}</strong> {q.remarks}
              </p>

              {/* 2-Column: Left (Previous Value) | Right (New Value) */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                {/* Left: Previous Value (Read only) */}
                <div>
                  <span className='block text-xs font-medium text-slate-500 mb-1'>
                    {hi ? 'पहले भरा गया मान (पुराना)' : 'Previous value'}
                  </span>
                  <div className='min-h-[38px] rounded-md border border-slate-200 bg-slate-100/90 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center select-all'>
                    {q.currentValue || <span className='text-slate-400 font-normal italic'>{hi ? 'खाली' : 'Empty'}</span>}
                  </div>
                </div>

                {/* Right: New Value (Blank input) */}
                <div>
                  <label htmlFor={inputId} className='block text-xs font-semibold text-slate-800 mb-1'>
                    {hi ? 'नया मान भरें *' : 'Enter new value *'}
                  </label>

                  {(q.inputType === 'select' || q.inputType === 'radio') && (
                    <select
                      id={inputId}
                      value={values[q.id] ?? ''}
                      onChange={e => setValue(q.id, e.target.value)}
                      aria-invalid={hasError}
                      className='h-[38px] w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-900'
                    >
                      <option value=''>{hi ? '— नया विकल्प चुनें —' : '— Select —'}</option>
                      {q.options.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {q.inputType === 'multiselect' && (
                    <div id={inputId} className='flex flex-col gap-1 rounded-md border border-slate-300 bg-white p-2'>
                      {q.options.map(o => (
                        <label key={o.value} className='flex items-center gap-2 text-xs text-slate-800 cursor-pointer'>
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
                      placeholder={hi ? 'नया विवरण यहाँ भरें...' : 'Enter new details...'}
                      maxLength={q.maxLength}
                      rows={2}
                      aria-invalid={hasError}
                      className='text-xs bg-white'
                    />
                  )}

                  {q.inputType === 'text' && (
                    <Input
                      id={inputId}
                      value={values[q.id] ?? ''}
                      onChange={e => setValue(q.id, e.target.value)}
                      placeholder={hi ? 'नया मान भरें...' : 'Enter new value...'}
                      maxLength={q.maxLength}
                      aria-invalid={hasError}
                      className='h-[38px] text-xs bg-white'
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Optional Notes */}
        <div className='pt-2'>
          <label htmlFor='applicant-notes' className='block text-xs font-semibold text-slate-700 mb-1'>
            {hi ? 'अतिरिक्त टिप्पणी / स्पष्टीकरण (वैकल्पिक)' : 'Additional Note / Clarification (Optional)'}
          </label>
          <Textarea
            id='applicant-notes'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
              hi
                ? 'यदि आप किए गए सुधार के संबंध में कोई बात लिखना चाहें...'
                : 'Any clarification regarding this correction...'
            }
            maxLength={1000}
            rows={2}
            className='text-xs bg-white'
          />
        </div>

        {error && (
          <Alert variant='destructive'>
            <AlertDescription className='text-xs'>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type='button'
          onClick={submit}
          disabled={isSaving}
          className='w-full h-11 bg-[#0c2847] hover:bg-[#071a2f] text-white font-semibold text-xs sm:text-sm'
        >
          {isSaving ? (
            <>
              <Loader2Icon className='size-4 animate-spin mr-2' />
              {hi ? 'सुधार जमा हो रहा है...' : 'Submitting...'}
            </>
          ) : hi ? (
            'सुधार जमा करें'
          ) : (
            'Submit Corrections'
          )}
        </Button>
      </div>
    </div>
  )
}

export default FieldCorrectionsCard
