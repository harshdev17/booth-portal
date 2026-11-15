'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { HelpCircleIcon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export type MultiQueryCandidate = {
  fieldKey: string
  label: string
  currentValue: string
  alreadyOpen: boolean
}

/**
 * Raises a query on several fields at once with one shared remark, instead
 * of clicking "Raise query" on each field one at a time — per explicit
 * request. The existing single-field "Raise query" link on each
 * ApplicationFieldRow is unaffected and stays available as an option too.
 */
const MultiFieldQueryDialog = ({
  applicationId,
  candidates
}: {
  applicationId: string
  candidates: MultiQueryCandidate[]
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [remarks, setRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ raisedCount: number; skippedCount: number } | null>(null)

  if (candidates.length === 0) return null

  const toggle = (fieldKey: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)

      if (checked) next.add(fieldKey)
      else next.delete(fieldKey)

      return next
    })
  }

  const submit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/field-queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKeys: Array.from(selected), remarks })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error ?? 'Could not raise the queries. Please try again.')

        return
      }

      setResult({ raisedCount: data.raised?.length ?? 0, skippedCount: data.skipped?.length ?? 0 })
      router.refresh()
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeDialog = () => {
    setOpen(false)
    setSelected(new Set())
    setRemarks('')
    setError(null)
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={next => (next ? setOpen(true) : closeDialog())}>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={() => setOpen(true)}
        className='text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50'
      >
        <HelpCircleIcon className='size-3.5' />
        Raise Query on Multiple Fields
      </Button>
      <DialogContent className='max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Raise Query on Multiple Fields</DialogTitle>
          <DialogDescription>
            Select every field that needs correcting and write one shared remark. The applicant is notified once,
            listing all selected fields.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <Alert className='border-emerald-300 bg-emerald-50 text-emerald-800'>
            <AlertDescription className='font-semibold'>
              {result.raisedCount} field(s) queried.
              {result.skippedCount > 0 ? ` ${result.skippedCount} skipped (already open or not queryable).` : ''}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className='flex max-h-72 flex-col gap-2 overflow-y-auto rounded-md border p-2'>
              {candidates.map(c => (
                <label
                  key={c.fieldKey}
                  className={`flex items-start gap-2.5 rounded-md p-2 text-sm ${
                    c.alreadyOpen ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  <Checkbox
                    checked={selected.has(c.fieldKey)}
                    onCheckedChange={checked => toggle(c.fieldKey, checked === true)}
                    disabled={c.alreadyOpen}
                    className='mt-0.5'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-slate-800'>
                      {c.label}
                      {c.alreadyOpen && <span className='ml-1.5 text-xs font-normal text-amber-700'>(query already open)</span>}
                    </p>
                    <p className='truncate text-xs text-muted-foreground'>{c.currentValue || '—'}</p>
                  </div>
                </label>
              ))}
            </div>

            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder='What needs to be corrected across the selected fields? (required, shown to the applicant)'
              maxLength={512}
              rows={3}
            />

            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={closeDialog}>Close</Button>
          ) : (
            <>
              <Button type='button' variant='outline' onClick={closeDialog} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type='button'
                onClick={submit}
                disabled={isSubmitting || selected.size === 0 || remarks.trim().length === 0}
                className='bg-amber-600 text-white hover:bg-amber-700'
              >
                {isSubmitting && <Loader2Icon className='size-3.5 animate-spin' />}
                Raise Query on {selected.size || ''} Field{selected.size === 1 ? '' : 's'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MultiFieldQueryDialog
