'use client'

import { useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'

type Props = {
  applicationId: string // opaque id, for the API call
  fieldKey: string
  label: string
  value: string
  mono?: boolean
  full?: boolean
  canCheck: boolean
  initiallyChecked: boolean
}

/**
 * One field in the Personal/Application tabs, with a checkbox an admin
 * ticks to mark that field's data as verified-correct — a plain-data
 * counterpart to document verification (same document:verify permission,
 * same Verification Staff role), separate from and not required for the
 * application's own approve/reject decision. Self-contained: each row owns
 * its own toggle request rather than lifting state up to the page, the same
 * pattern as DocumentDecisionActions/ApplicationPdfDownloads on this page.
 */
const ApplicationFieldRow = ({
  applicationId,
  fieldKey,
  label,
  value,
  mono,
  full,
  canCheck,
  initiallyChecked
}: Props) => {
  const [checked, setChecked] = useState(initiallyChecked)
  const [isSaving, setIsSaving] = useState(false)

  const toggle = async (next: boolean) => {
    setChecked(next) // optimistic
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/field-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey, checked: next })
      })

      if (!response.ok) setChecked(!next) // revert on failure
    } catch {
      setChecked(!next)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`flex items-start gap-2.5 ${full ? 'sm:col-span-2' : ''}`}>
      {canCheck && (
        <Checkbox
          checked={checked}
          onCheckedChange={next => toggle(next === true)}
          disabled={isSaving}
          aria-label={`Mark "${label}" as verified correct`}
          className='mt-0.5 shrink-0'
        />
      )}
      <div className='min-w-0'>
        <p className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>{label}</p>
        <p className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
      </div>
    </div>
  )
}

export default ApplicationFieldRow
