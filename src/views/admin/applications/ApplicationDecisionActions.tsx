'use client'

import { useActionState, useState } from 'react'

import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

import {
  rejectApplicationAction,
  selectApplicationAction,
  type ApplicationActionState
} from '@/app/server/application-actions'

const initialState: ApplicationActionState = {}

type Props = {
  applicationId: number
  canApprove: boolean
  canReject: boolean
}

/**
 * Decision actions shown only when the application is "Under Review" — the
 * only stage from which these transitions are valid per
 * .ai/APPLICATION_FLOW.md Section 3. The server action independently
 * re-verifies both the current status and the caller's permission, so this
 * component being rendered is a UI convenience only, never the real gate.
 */
const ApplicationDecisionActions = ({ applicationId, canApprove, canReject }: Props) => {
  const [selectState, selectAction, isSelecting] = useActionState(selectApplicationAction, initialState)
  const [rejectState, rejectAction, isRejecting] = useActionState(rejectApplicationAction, initialState)
  const [rejectOpen, setRejectOpen] = useState(false)

  if (!canApprove && !canReject) return null

  return (
    <div className='flex flex-col gap-3'>
      {selectState.error && (
        <Alert variant='destructive'>
          <AlertDescription>{selectState.error}</AlertDescription>
        </Alert>
      )}
      {selectState.success && (
        <Alert>
          <AlertDescription>{selectState.success}</AlertDescription>
        </Alert>
      )}

      <div className='flex flex-wrap gap-2'>
        {canApprove && (
          <form action={selectAction}>
            <input type='hidden' name='applicationId' value={applicationId} />
            <Button
              type='submit'
              disabled={isSelecting}
              className='bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {isSelecting ? <Loader2Icon className='animate-spin' /> : <CheckIcon />}
              Mark as Selected
            </Button>
          </form>
        )}

        {canReject && (
          <Button type='button' variant='destructive' onClick={() => setRejectOpen(true)}>
            <XIcon />
            Reject Application
          </Button>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              This decision and your reason are recorded in the audit trail and cannot be undone from here.
            </DialogDescription>
          </DialogHeader>

          {rejectState.error && (
            <Alert variant='destructive'>
              <AlertDescription>{rejectState.error}</AlertDescription>
            </Alert>
          )}

          <form action={rejectAction} className='flex flex-col gap-3'>
            <input type='hidden' name='applicationId' value={applicationId} />
            <Textarea name='reason' placeholder='Reason for rejection (required)' required maxLength={512} rows={4} />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' variant='destructive' disabled={isRejecting}>
                {isRejecting && <Loader2Icon className='animate-spin' />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ApplicationDecisionActions
