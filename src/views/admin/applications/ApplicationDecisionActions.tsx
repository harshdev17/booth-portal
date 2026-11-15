'use client'

import { useImperativeHandle, useState, type Ref } from 'react'

import { useRouter } from 'next/navigation'

import { Loader2Icon, RotateCcwIcon, XIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ApproveApplicationDialog, { type DialogHandle } from '@/views/admin/applications/ApproveApplicationDialog'

type Props = {
  applicationId: string
  canApprove: boolean
  canReject: boolean

  /** Shown in a tooltip on the Approve button when canApprove is false. */
  approveDisabledReason?: string

  /** Shown in a tooltip on the Reject button when canReject is false. */
  rejectDisabledReason?: string

  /** Shows the "Under Review" undo button — only meaningful when the application is currently approved/rejected. */
  canRevertToReview?: boolean
  nowrap?: boolean
}

export const RejectButton = ({
  applicationId,
  hideTrigger,
  disabled,
  disabledReason,
  ref
}: {
  applicationId: string
  hideTrigger?: boolean
  disabled?: boolean
  disabledReason?: string
  ref?: Ref<DialogHandle>
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notify, setNotify] = useState(true)

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))

  const submit = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: formData.get('reason'), notify })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not reject this application.')

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
      variant='destructive'
      className='whitespace-nowrap'
      disabled={disabled}
      onClick={() => {
        setNotify(true)
        setOpen(true)
      }}
    >
      <XIcon />
      Reject
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              This decision and your reason are recorded in the audit trail and cannot be undone from here.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form action={submit} className='flex flex-col gap-3'>
            <Textarea name='reason' placeholder='Reason for rejection (required)' required maxLength={512} rows={4} />
            <label className='flex items-center gap-2 text-sm text-slate-700'>
              <input
                type='checkbox'
                checked={notify}
                onChange={e => setNotify(e.target.checked)}
                className='size-4 rounded border-slate-300'
              />
              Notify applicant via Email &amp; WhatsApp (includes the reason above)
            </label>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' variant='destructive' disabled={submitting}>
                {submitting && <Loader2Icon className='animate-spin' />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Plain undo — puts a mistakenly approved/rejected application straight
 * back to "Under Review", distinct from re-deciding it the other way
 * (Approve/Reject already allow undoing each other, see the comments on
 * canApprove/canReject in the detail page). Only shown when the
 * application is currently 'approved' or 'rejected' — there is nothing to
 * revert otherwise.
 */
const RevertToReviewButton = ({
  applicationId,
  disabled,
  disabledReason
}: {
  applicationId: string
  disabled?: boolean
  disabledReason?: string
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/revert-to-review`, { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not revert this application.')

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
    <Button type='button' size='sm' variant='outline' className='whitespace-nowrap' disabled={disabled} onClick={() => setOpen(true)}>
      <RotateCcwIcon />
      Under Review
    </Button>
  )

  return (
    <>
      {disabled && disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span tabIndex={0} className='inline-flex' />}>{trigger}</TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Under Review</DialogTitle>
            <DialogDescription>
              This puts the application back in the review queue, undoing the current decision. No notification is
              sent to the applicant. This is recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={submit} disabled={submitting}>
              {submitting && <Loader2Icon className='animate-spin' />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Approve/Reject are always rendered; each is disabled (with a tooltip
 * explaining why) when the application isn't in a valid stage for that
 * transition per .ai/APPLICATION_FLOW.md Section 3. Both server routes
 * independently re-verify status/permission/document-verification, so this
 * component's disabled state is a UI convenience only, never the real gate.
 * A third "Under Review" button appears only when the application is
 * currently approved/rejected, for a plain undo without re-deciding it —
 * per explicit request.
 */
const ApplicationDecisionActions = ({
  applicationId,
  canApprove,
  canReject,
  approveDisabledReason,
  rejectDisabledReason,
  canRevertToReview,
  nowrap
}: Props) => {
  return (
    <div className={`flex gap-2 ${nowrap ? 'flex-nowrap' : 'flex-wrap'}`}>
      <ApproveApplicationDialog applicationId={applicationId} disabled={!canApprove} disabledReason={approveDisabledReason} />
      <RejectButton applicationId={applicationId} disabled={!canReject} disabledReason={rejectDisabledReason} />
      {canRevertToReview && <RevertToReviewButton applicationId={applicationId} />}
    </div>
  )
}

export default ApplicationDecisionActions
