'use client'

import type { ReactNode } from 'react'
import { useActionState, useState } from 'react'

import { CheckIcon, HelpCircleIcon, Loader2Icon, XIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

import {
  queryDocumentAction,
  rejectDocumentAction,
  verifyDocumentAction,
  type DocumentActionState
} from '@/app/server/document-actions'

const initialState: DocumentActionState = {}

const VerifyButton = ({ documentId }: { documentId: number }) => {
  const [state, action, isPending] = useActionState(verifyDocumentAction, initialState)

  return (
    <form action={action}>
      <input type='hidden' name='documentId' value={documentId} />
      {state.error && <p className='mb-1 text-xs text-red-600'>{state.error}</p>}
      <Button type='submit' size='sm' disabled={isPending} className='bg-emerald-600 hover:bg-emerald-700 text-white'>
        {isPending ? <Loader2Icon className='animate-spin' /> : <CheckIcon />}
        Verify
      </Button>
    </form>
  )
}

const RemarkDialogButton = ({
  documentId,
  variant,
  label,
  icon
}: {
  documentId: number
  variant: 'rejected' | 'query'
  label: string
  icon: ReactNode
}) => {
  const action = variant === 'rejected' ? rejectDocumentAction : queryDocumentAction
  const [state, formAction, isPending] = useActionState(action, initialState)
  const [open, setOpen] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(0)

  // Dialog closes once the action succeeds — previously stayed open with
  // its remark text still filled in, which let an admin accidentally submit
  // the same query/reject multiple times (reported live). useActionState's
  // state persists across the dialog being closed/reopened (the component
  // itself never unmounts), so submittedAt distinguishes a fresh success
  // from the stale success left over from a previous open; derived here
  // rather than via a setState-in-effect so this stays a single render.
  const isDialogOpen = open && !(submittedAt && state.success)

  const openDialog = () => {
    setSubmittedAt(0)
    setOpen(true)
  }

  return (
    <>
      <Button type='button' size='sm' variant={variant === 'rejected' ? 'destructive' : 'outline'} onClick={openDialog}>
        {icon}
        {label}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>This remark is shown in the audit trail and recorded against the document.</DialogDescription>
          </DialogHeader>

          {state.error && (
            <Alert variant='destructive'>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <form action={formAction} onSubmit={() => setSubmittedAt(Date.now())} className='flex flex-col gap-3'>
            <input type='hidden' name='documentId' value={documentId} />
            <Textarea name='remarks' placeholder='Remark (required)' required maxLength={512} rows={3} />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' variant={variant === 'rejected' ? 'destructive' : 'default'} disabled={isPending}>
                {isPending && <Loader2Icon className='animate-spin' />}
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Previously hidden entirely once a document was 'verified', which meant an
 * admin who verified a document by mistake (or needed to reject it after
 * verifying) had no way back — reported live. Reject and Raise Query now
 * always show regardless of current status (the server action has no
 * status guard blocking a verified -> rejected transition either); only
 * Verify itself is hidden once already verified, since re-verifying an
 * already-verified document is a no-op.
 */
const DocumentDecisionActions = ({ documentId, currentStatus }: { documentId: number; currentStatus: string }) => (
  <div className='flex flex-wrap items-center gap-2'>
    {currentStatus !== 'verified' && <VerifyButton documentId={documentId} />}
    <RemarkDialogButton documentId={documentId} variant='query' label='Raise Query' icon={<HelpCircleIcon />} />
    <RemarkDialogButton documentId={documentId} variant='rejected' label='Reject' icon={<XIcon />} />
  </div>
)

export default DocumentDecisionActions
