'use client'

import { useImperativeHandle, useState, type Ref } from 'react'

import { useRouter } from 'next/navigation'

import { AlertTriangleIcon, CheckCheckIcon, CheckCircle2Icon, CheckIcon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type ChecklistField = { key: string; label: string; checked: boolean; value: string }

type Checklist = {
  status: string
  allDocumentsVerified: boolean
  missingDocumentLabels: string[]
  fields: ChecklistField[]
}

/**
 * Approve is gated on every required document already being verified (hard
 * server-side gate — see /api/admin/applications/[id]/approve) and, on
 * confirm, marks every application field as "data verified correct" in one
 * step instead of requiring each to be ticked individually on the detail
 * page first. The checklist is always fetched fresh when the dialog opens
 * (never passed in as a prop) so this works the same from the Application
 * Detail page and from a row in the Applications list table alike.
 */
export type DialogHandle = { open: () => void }

const ApproveApplicationDialog = ({
  applicationId,
  hideTrigger,
  disabled,
  disabledReason,
  ref
}: {
  applicationId: string

  /** Row-action menus open the dialog through `ref` instead of rendering their own button. */
  hideTrigger?: boolean
  disabled?: boolean
  disabledReason?: string
  ref?: Ref<DialogHandle>
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Field keys currently mid-toggle (single checkbox click, or part of
  // "Mark All As Checked") — disables that row's checkbox while its
  // /field-checks request is in flight, so a double-click can't fire twice.
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set())
  const [markingAll, setMarkingAll] = useState(false)

  const openDialog = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    setChecklist(null)
    setTogglingKeys(new Set())
    setMarkingAll(false)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/approval-checklist`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not load the approval checklist.')
      } else {
        setChecklist(data)
      }
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Toggles one field's "data verified correct" checkmark immediately —
   * saved to application_field_checks right away via the same route the
   * detail page's per-field checkboxes already use (POST .../field-checks),
   * not deferred until "Confirm Approval". Per explicit request: checking a
   * box here must actually persist, not just preview.
   */
  const toggleField = async (field: ChecklistField, nextChecked: boolean) => {
    if (!checklist) return

    setTogglingKeys(prev => new Set(prev).add(field.key))

    // Optimistic update so the checkbox responds instantly; reverted below if the request fails.
    setChecklist({
      ...checklist,
      fields: checklist.fields.map(f => (f.key === field.key ? { ...f, checked: nextChecked } : f))
    })

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/field-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldKey: field.key, checked: nextChecked })
      })

      if (!response.ok) {
        // Revert on failure.
        setChecklist(prev =>
          prev ? { ...prev, fields: prev.fields.map(f => (f.key === field.key ? { ...f, checked: !nextChecked } : f)) } : prev
        )
        setError('Could not update that field. Please try again.')
      }
    } catch {
      setChecklist(prev =>
        prev ? { ...prev, fields: prev.fields.map(f => (f.key === field.key ? { ...f, checked: !nextChecked } : f)) } : prev
      )
      setError('Could not reach the server. Please try again.')
    } finally {
      setTogglingKeys(prev => {
        const next = new Set(prev)

        next.delete(field.key)

        return next
      })
    }
  }

  const markAllChecked = async () => {
    if (!checklist) return

    const unchecked = checklist.fields.filter(f => !f.checked)

    if (unchecked.length === 0) return

    setMarkingAll(true)
    setError(null)

    try {
      const results = await Promise.all(
        unchecked.map(f =>
          fetch(`/api/admin/applications/${applicationId}/field-checks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldKey: f.key, checked: true })
          }).then(r => ({ key: f.key, ok: r.ok }))
        )
      )

      const okKeys = new Set(results.filter(r => r.ok).map(r => r.key))

      setChecklist(prev =>
        prev ? { ...prev, fields: prev.fields.map(f => (okKeys.has(f.key) ? { ...f, checked: true } : f)) } : prev
      )

      if (okKeys.size < unchecked.length) {
        setError('Some fields could not be marked checked. Please try again.')
      }
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setMarkingAll(false)
    }
  }

  useImperativeHandle(ref, () => ({ open: () => void openDialog() }))

  const confirmApprove = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not approve this application.')

        return
      }

      setOpen(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const trigger = (
    <Button
      type='button'
      size='sm'
      disabled={disabled}
      onClick={openDialog}
      className='whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white'
    >
      <CheckIcon />
      Approve
    </Button>
  )

  return (
    <>
      {!hideTrigger &&
        (disabled && disabledReason ? (
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} className='inline-flex' />}>{trigger}</TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              {checklist?.allDocumentsVerified
                ? 'Review each field below — click a checkmark to toggle it, or use "Mark All As Checked". Any field still unchecked when you approve will be marked checked automatically.'
                : 'Every required document must be verified before this application can be approved.'}
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className='flex items-center justify-center py-8'>
              <Loader2Icon className='size-6 animate-spin text-muted-foreground' />
            </div>
          )}

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && checklist && !checklist.allDocumentsVerified && (
            <Alert variant='destructive'>
              <AlertTriangleIcon className='size-4' />
              <AlertDescription>
                Still pending verification: {checklist.missingDocumentLabels.join(', ')}. Verify these from the
                Documents tab first.
              </AlertDescription>
            </Alert>
          )}

          {!loading && checklist && checklist.allDocumentsVerified && (
            <>
              {checklist.fields.length > 0 && (
                <div className='flex justify-end'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={markAllChecked}
                    disabled={markingAll || checklist.fields.every(f => f.checked)}
                    className='text-xs'
                  >
                    {markingAll ? <Loader2Icon className='size-3.5 animate-spin' /> : <CheckCheckIcon className='size-3.5' />}
                    Mark All As Checked
                  </Button>
                </div>
              )}

              <div className='max-h-96 overflow-y-auto rounded-md border'>
                <ul className='divide-y'>
                  {checklist.fields.map(f => {
                    const isToggling = togglingKeys.has(f.key)

                    return (
                      <li key={f.key} className='flex items-start gap-2 px-3 py-2.5 text-sm'>
                        <button
                          type='button'
                          disabled={isToggling}
                          onClick={() => toggleField(f, !f.checked)}
                          aria-label={f.checked ? `Uncheck ${f.label}` : `Check ${f.label}`}
                          className='mt-0.5 shrink-0 disabled:opacity-50'
                        >
                          {isToggling ? (
                            <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
                          ) : (
                            <CheckCircle2Icon
                              className={`size-4 ${f.checked ? 'text-emerald-600' : 'text-muted-foreground/40'}`}
                            />
                          )}
                        </button>
                        <div className='min-w-0 flex-1'>
                          <span className={f.checked ? 'text-slate-800' : 'text-muted-foreground'}>{f.label}</span>
                          <p className='mt-0.5 break-words text-xs text-slate-500'>{f.value || '—'}</p>
                        </div>
                        {!f.checked && (
                          <span className='ml-auto shrink-0 text-[10px] font-semibold text-amber-600'>Not checked</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {checklist.fields.length === 0 && (
                  <p className='px-3 py-4 text-center text-sm text-muted-foreground'>No fields to check for this application.</p>
                )}
              </div>
            </>
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={confirmApprove}
              disabled={loading || submitting || !checklist?.allDocumentsVerified}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {submitting && <Loader2Icon className='animate-spin' />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ApproveApplicationDialog
