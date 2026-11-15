'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { HelpCircleIcon, Loader2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export type FieldQuerySummary = {
  id: number
  status: 'open' | 'responded'
  remarks: string
  previousValue: string | null
  newValue: string | null
}

type Props = {
  applicationId: string // opaque id, for the API call
  fieldKey: string
  label: string
  value: string
  mono?: boolean
  full?: boolean
  canCheck: boolean
  initiallyChecked: boolean

  /** Whether a field query can be raised on this field for this application. */
  canQuery?: boolean

  /** This field's latest open or answered query, if any. */
  fieldQuery?: FieldQuerySummary | null
}

/**
 * One field in the Personal/Application tabs, with a checkbox an admin
 * ticks to mark that field's data as verified-correct — a plain-data
 * counterpart to document verification (same document:verify permission,
 * same Verification Staff role), separate from and not required for the
 * application's own approve/reject decision. Self-contained: each row owns
 * its own toggle request rather than lifting state up to the page, the same
 * pattern as DocumentDecisionActions/ApplicationPdfDownloads on this page.
 *
 * Also lets the reviewer raise a query on this specific field, which the
 * applicant then corrects from the Check Application Status page.
 */
const ApplicationFieldRow = ({
  applicationId,
  fieldKey,
  label,
  value,
  mono,
  full,
  canCheck,
  initiallyChecked,
  canQuery = false,
  fieldQuery = null
}: Props) => {
  const router = useRouter()
  const [checked, setChecked] = useState(initiallyChecked)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [queryError, setQueryError] = useState<string | null>(null)
  const [isQuerying, setIsQuerying] = useState(false)

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

  const raiseQuery = async () => {
    setQueryError(null)
    setIsQuerying(true)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/field-queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey, remarks })
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setQueryError(body.error ?? 'Could not raise the query. Please try again.')

        return
      }

      setDialogOpen(false)
      setRemarks('')
      router.refresh()
    } catch {
      setQueryError('Could not reach the server. Please try again.')
    } finally {
      setIsQuerying(false)
    }
  }

  const withdrawQuery = async () => {
    if (!fieldQuery || !window.confirm(`Withdraw the query on "${label}"?`)) return

    setIsQuerying(true)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/field-queries?queryId=${fieldQuery.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        window.alert(body.error ?? 'Could not withdraw the query.')
      }

      router.refresh()
    } finally {
      setIsQuerying(false)
    }
  }

  const isOpen = fieldQuery?.status === 'open'

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
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          <p className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>{label}</p>
          {canQuery && !isOpen && (
            <button
              type='button'
              onClick={() => {
                setQueryError(null)
                setDialogOpen(true)
              }}
              className='inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline'
            >
              <HelpCircleIcon className='size-3' />
              Raise query
            </button>
          )}
        </div>
        <p className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>

        {isOpen && fieldQuery && (
          <div className='mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900'>
            <span className='font-bold'>Query open:</span> {fieldQuery.remarks}
            {canQuery && (
              <button
                type='button'
                onClick={withdrawQuery}
                disabled={isQuerying}
                className='ml-2 font-semibold text-amber-700 underline hover:text-amber-950'
              >
                Withdraw
              </button>
            )}
          </div>
        )}

        {fieldQuery?.status === 'responded' && (
          <div className='mt-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900'>
            <span className='font-bold'>Corrected by applicant</span> (query: {fieldQuery.remarks}). Previously:{' '}
            <span className='font-semibold'>{fieldQuery.previousValue || '—'}</span>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Query: {label}</DialogTitle>
            <DialogDescription>
              The applicant will be notified and can correct this field themselves from the Check Application Status
              page. Current value: <span className='font-semibold'>{value || '—'}</span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder='What needs to be corrected? (required, shown to the applicant)'
            maxLength={512}
            rows={3}
          />
          {queryError && <p className='text-xs text-red-600'>{queryError}</p>}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setDialogOpen(false)} disabled={isQuerying}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={raiseQuery}
              disabled={isQuerying || remarks.trim().length === 0}
              className='bg-amber-600 text-white hover:bg-amber-700'
            >
              {isQuerying && <Loader2Icon className='animate-spin' />}
              Raise Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApplicationFieldRow
