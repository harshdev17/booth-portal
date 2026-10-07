'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { Loader2Icon, XIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import ApproveApplicationDialog from '@/views/admin/applications/ApproveApplicationDialog'

type Props = {
  applicationId: string
  canApprove: boolean
  canReject: boolean
  nowrap?: boolean
}

const RejectButton = ({ applicationId }: { applicationId: string }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: formData.get('reason') })
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

  return (
    <>
      <Button type='button' size='sm' variant='destructive' className='whitespace-nowrap' onClick={() => setOpen(true)}>
        <XIcon />
        Reject
      </Button>

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
 * Decision actions shown only when the application is "Under Review" (or,
 * for Reject, also "Query Raised") — the only stages from which these
 * transitions are valid per .ai/APPLICATION_FLOW.md Section 3. Both server
 * routes independently re-verify status/permission/document-verification,
 * so this component being rendered is a UI convenience only, never the real
 * gate. Used both on the Application Detail page and inline in the
 * Applications list table's Actions column.
 */
const ApplicationDecisionActions = ({ applicationId, canApprove, canReject, nowrap }: Props) => {
  if (!canApprove && !canReject) return null

  return (
    <div className={`flex gap-2 ${nowrap ? 'flex-nowrap' : 'flex-wrap'}`}>
      {canApprove && <ApproveApplicationDialog applicationId={applicationId} />}
      {canReject && <RejectButton applicationId={applicationId} />}
    </div>
  )
}

export default ApplicationDecisionActions
