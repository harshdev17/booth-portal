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

  return (
    <>
      <Button
        type='button'
        size='sm'
        variant={variant === 'rejected' ? 'destructive' : 'outline'}
        onClick={() => setOpen(true)}
      >
        {icon}
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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

          <form action={formAction} className='flex flex-col gap-3'>
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

const DocumentDecisionActions = ({ documentId }: { documentId: number }) => (
  <div className='flex flex-wrap items-center gap-2'>
    <VerifyButton documentId={documentId} />
    <RemarkDialogButton documentId={documentId} variant='query' label='Raise Query' icon={<HelpCircleIcon />} />
    <RemarkDialogButton documentId={documentId} variant='rejected' label='Reject' icon={<XIcon />} />
  </div>
)

export default DocumentDecisionActions
