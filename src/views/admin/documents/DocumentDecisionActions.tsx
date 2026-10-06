'use client'

import { useActionState, useState } from 'react'

import { CheckIcon, HelpCircleIcon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

import { queryDocumentAction, verifyDocumentAction, type DocumentActionState } from '@/app/server/document-actions'

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

const RaiseQueryButton = ({ documentId }: { documentId: number }) => {
  const [state, formAction, isPending] = useActionState(queryDocumentAction, initialState)
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
      <Button type='button' size='sm' variant='outline' onClick={openDialog}>
        <HelpCircleIcon />
        Raise Query
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Query</DialogTitle>
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
              <Button type='submit' disabled={isPending}>
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
 * Reject was removed from this UI (business decision: a document can only be
 * Verified or sent back for a Raise Query response, never outright
 * rejected) — see .ai/DECISIONS.md. Verify is hidden once the document is
 * already verified, since re-verifying is a no-op; Raise Query always shows,
 * so an admin can still flag a problem with an already-verified document.
 * Re-uploading in response to a query resets the document to 'pending'
 * server-side (see POST /api/applications/[id]/documents), which brings
 * Verify back automatically.
 */
const DocumentDecisionActions = ({ documentId, currentStatus }: { documentId: number; currentStatus: string }) => (
  <div className='flex flex-wrap items-center gap-2'>
    {currentStatus !== 'verified' && <VerifyButton documentId={documentId} />}
    <RaiseQueryButton documentId={documentId} />
  </div>
)

export default DocumentDecisionActions
