'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { AlertTriangleIcon, CheckCircle2Icon, CheckIcon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ChecklistField = { key: string; label: string; checked: boolean }

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
const ApproveApplicationDialog = ({ applicationId }: { applicationId: string }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checklist, setChecklist] = useState<Checklist | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openDialog = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    setChecklist(null)

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

  const confirmApprove = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/approve`, { method: 'POST' })
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

  return (
    <>
      <Button type='button' size='sm' onClick={openDialog} className='bg-emerald-600 hover:bg-emerald-700 text-white'>
        <CheckIcon />
        Approve Application
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              {checklist?.allDocumentsVerified
                ? 'Confirm the checklist below — approving will mark every field as verified.'
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
            <div className='max-h-72 overflow-y-auto rounded-md border'>
              <ul className='divide-y'>
                {checklist.fields.map(f => (
                  <li key={f.key} className='flex items-center gap-2 px-3 py-2 text-sm'>
                    <CheckCircle2Icon
                      className={`size-4 shrink-0 ${f.checked ? 'text-emerald-600' : 'text-muted-foreground/40'}`}
                    />
                    <span className={f.checked ? 'text-slate-800' : 'text-muted-foreground'}>{f.label}</span>
                    {!f.checked && (
                      <span className='ml-auto shrink-0 text-[10px] font-semibold text-amber-600'>Will be marked checked</span>
                    )}
                  </li>
                ))}
              </ul>
              {checklist.fields.length === 0 && (
                <p className='px-3 py-4 text-center text-sm text-muted-foreground'>No fields to check for this application.</p>
              )}
            </div>
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
