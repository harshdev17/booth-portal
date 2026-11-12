'use client'

import { useActionState, useImperativeHandle, useState, type Ref } from 'react'

import { CheckIcon, ExternalLinkIcon, HelpCircleIcon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { queryApplicationAction, queryDocumentAction, verifyDocumentAction, type DocumentActionState } from '@/app/server/document-actions'
import type { DialogHandle } from '@/views/admin/applications/ApproveApplicationDialog'

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

/**
 * Application-level equivalent of RaiseQueryButton, for an application with
 * no document rows at all to attach a per-document query to (e.g. a
 * backfilled/imported application that never went through the normal
 * upload flow). Moves the application straight to 'query_raised' via
 * queryApplicationAction instead of a specific document's verification
 * status.
 */
export const RaiseApplicationQueryButton = ({
  applicationId,
  hideTrigger,
  ref
}: {
  applicationId: number
  hideTrigger?: boolean
  ref?: Ref<DialogHandle>
}) => {
  const [state, formAction, isPending] = useActionState(queryApplicationAction, initialState)
  const [open, setOpen] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(0)

  const isDialogOpen = open && !(submittedAt && state.success)

  const openDialog = () => {
    setSubmittedAt(0)
    setOpen(true)
  }

  useImperativeHandle(ref, () => ({ open: openDialog }))

  return (
    <>
      {!hideTrigger && (
        <Button type='button' size='sm' variant='outline' onClick={openDialog}>
          <HelpCircleIcon />
          Raise Query
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Query</DialogTitle>
            <DialogDescription>
              This application has no uploaded documents to query individually. This remark applies to the
              application as a whole and is shown in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {state.error && (
            <Alert variant='destructive'>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <form action={formAction} onSubmit={() => setSubmittedAt(Date.now())} className='flex flex-col gap-3'>
            <input type='hidden' name='applicationId' value={applicationId} />
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

export type DocumentOption = { id: number; label: string; verification_status: string }

/**
 * List-page equivalent of RaiseApplicationQueryButton, for a row where the
 * application DOES have uploaded documents — per explicit request, raising
 * a query from the Applications list must let the admin pick WHICH document
 * it's about, instead of blindly raising a query against the whole
 * application (previously the only option here, meant only for applications
 * with no documents at all). Falls back to the application-level query
 * (queryApplicationAction) when `documents` is empty, same as before.
 */
export const RaiseListQueryButton = ({
  rawApplicationId,
  documents,
  hideTrigger,
  ref
}: {
  rawApplicationId: number
  documents: DocumentOption[]
  hideTrigger?: boolean
  ref?: Ref<DialogHandle>
}) => {
  const [documentState, documentFormAction, isDocumentPending] = useActionState(queryDocumentAction, initialState)
  const [applicationState, applicationFormAction, isApplicationPending] = useActionState(queryApplicationAction, initialState)
  const [verifyState, verifyFormAction, isVerifyPending] = useActionState(verifyDocumentAction, initialState)
  const [open, setOpen] = useState(false)
  const [submittedAt, setSubmittedAt] = useState(0)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(documents[0] ? String(documents[0].id) : '')

  const hasDocuments = documents.length > 0
  const state = hasDocuments ? documentState : applicationState
  const isPending = hasDocuments ? isDocumentPending : isApplicationPending
  const isDialogOpen = open && !(submittedAt && state.success) && !verifyState.success
  const selectedDocument = documents.find(doc => String(doc.id) === selectedDocumentId) ?? null

  const openDialog = () => {
    setSubmittedAt(0)
    setOpen(true)
  }

  useImperativeHandle(ref, () => ({ open: openDialog }))

  return (
    <>
      {!hideTrigger && (
        <Button type='button' size='sm' variant='outline' onClick={openDialog}>
          <HelpCircleIcon />
          Raise Query
        </Button>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Query</DialogTitle>
            <DialogDescription>
              {hasDocuments
                ? 'Pick the document this query is about. The remark is shown in the audit trail and sent to the applicant.'
                : 'This application has no uploaded documents to query individually. This remark applies to the application as a whole and is shown in the audit trail.'}
            </DialogDescription>
          </DialogHeader>

          {state.error && (
            <Alert variant='destructive'>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {verifyState.error && (
            <Alert variant='destructive'>
              <AlertDescription>{verifyState.error}</AlertDescription>
            </Alert>
          )}

          {hasDocuments && (
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs font-semibold'>Document</Label>
              <Select value={selectedDocumentId} onValueChange={value => setSelectedDocumentId(value ?? '')}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select a document' />
                </SelectTrigger>
                <SelectContent>
                  {documents.map(doc => (
                    <SelectItem
                      key={doc.id}
                      value={String(doc.id)}
                      label={`${doc.label}${doc.verification_status === 'query' ? ' (query already open)' : ''}`}
                    >
                      {doc.label}
                      {doc.verification_status === 'query' ? ' (query already open)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedDocument && (
                <div className='flex items-center justify-between gap-2'>
                  <a
                    href={`/api/documents/${selectedDocument.id}/preview`}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-1 text-xs font-semibold text-[#0c2847] hover:underline'
                  >
                    <ExternalLinkIcon className='size-3.5' />
                    View document
                  </a>

                  {selectedDocument.verification_status !== 'verified' && (
                    <form action={verifyFormAction}>
                      <input type='hidden' name='documentId' value={selectedDocument.id} />
                      <Button type='submit' size='sm' variant='outline' disabled={isVerifyPending}>
                        {isVerifyPending ? <Loader2Icon className='animate-spin' /> : <CheckIcon />}
                        Verify
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          <form
            action={hasDocuments ? documentFormAction : applicationFormAction}
            onSubmit={() => setSubmittedAt(Date.now())}
            className='flex flex-col gap-3'
          >
            {hasDocuments ? (
              <input type='hidden' name='documentId' value={selectedDocumentId} />
            ) : (
              <input type='hidden' name='applicationId' value={rawApplicationId} />
            )}
            <Textarea name='remarks' placeholder='Remark (required)' required maxLength={512} rows={3} />
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={isPending || (hasDocuments && !selectedDocumentId)}>
                {isPending && <Loader2Icon className='animate-spin' />}
                Raise Query
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default DocumentDecisionActions
