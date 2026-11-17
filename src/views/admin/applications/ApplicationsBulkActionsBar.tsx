'use client'

import { useState } from 'react'

import { BellRingIcon, CheckIcon, GavelIcon, Loader2Icon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

type SelectedRow = {
  encodedId: string
  isPaymentPending: boolean
  canApprove: boolean
  canReject: boolean
  canSelectForAuction: boolean
}

type Props = {
  selectedRows: SelectedRow[]
  onDone: () => void
}

type BusyAction = 'reminder' | 'approve' | 'reject' | 'auction' | null

/**
 * Toolbar shown above the Applications table once 1+ rows are
 * checkbox-selected — "Send Payment Reminder", "Approve", "Reject" (all per
 * explicit request, 2026-11-05), and "Select for Auction" (2026-11-17).
 * Each button is only enabled when at least one SELECTED row is eligible
 * for that specific action; the backend bulk routes independently re-check
 * eligibility per application regardless (never trusts this client-side
 * gate), so this only prevents a confusing "click does nothing" button, not
 * a security boundary.
 *
 * Confirmed (see single-application approve/route.ts and reject/route.ts):
 * approving or rejecting an application sends NO email/WhatsApp notification
 * of any kind — it's purely an internal status change — so the bulk
 * versions inherit that same behavior unchanged. "Select for Auction" is the
 * one exception: it immediately sends the Auction Participation Fee
 * activation message (WhatsApp/email), the same one a real draw sends to
 * its winners — the confirm dialog says so explicitly before it fires.
 */
export default function ApplicationsBulkActionsBar({ selectedRows, onDone }: Props) {
  const [busy, setBusy] = useState<BusyAction>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (selectedRows.length === 0) return null

  const reminderEligible = selectedRows.filter(r => r.isPaymentPending)
  const approveEligible = selectedRows.filter(r => r.canApprove)
  const rejectEligible = selectedRows.filter(r => r.canReject)
  const auctionEligible = selectedRows.filter(r => r.canSelectForAuction)

  const runAction = async (action: BusyAction, request: () => Promise<Response>) => {
    setError(null)
    setMessage(null)
    setBusy(action)

    try {
      const res = await request()
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Action failed.')

        return
      }

      setMessage(data.message ?? 'Done.')
      onDone()
    } catch {
      setError('Network error.')
    } finally {
      setBusy(null)
    }
  }

  const sendBulkReminder = () =>
    runAction('reminder', () =>
      fetch('/api/admin/applications/bulk-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: reminderEligible.map(r => r.encodedId) })
      })
    )

  const bulkApprove = () => {
    const confirmed = window.confirm(
      `Approve ${approveEligible.length} selected application${approveEligible.length === 1 ? '' : 's'}? This marks all their checklist fields as reviewed.`
    )

    if (!confirmed) return

    runAction('approve', () =>
      fetch('/api/admin/applications/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: approveEligible.map(r => r.encodedId) })
      })
    )
  }

  const bulkSelectForAuction = () => {
    const confirmed = window.confirm(
      `Select ${auctionEligible.length} application${auctionEligible.length === 1 ? '' : 's'} for auction? Each one's status moves to "Selected For Auction", the Auction Participation Fee is seeded, and a WhatsApp/email message with the payment link is sent immediately.`
    )

    if (!confirmed) return

    runAction('auction', () =>
      fetch('/api/admin/applications/bulk-select-for-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: auctionEligible.map(r => r.encodedId) })
      })
    )
  }

  const bulkReject = () => {
    const reason = window.prompt(
      `Reason for rejecting ${rejectEligible.length} selected application${rejectEligible.length === 1 ? '' : 's'} (applies to all of them):`
    )

    if (!reason || !reason.trim()) return

    runAction('reject', () =>
      fetch('/api/admin/applications/bulk-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: rejectEligible.map(r => r.encodedId), reason: reason.trim() })
      })
    )
  }

  return (
    <div className='flex flex-wrap items-center gap-3 border-b bg-amber-50/60 px-4 py-2.5'>
      <span className='text-xs font-bold text-amber-900'>{selectedRows.length} selected</span>

      {reminderEligible.length > 0 && (
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={busy !== null}
          onClick={sendBulkReminder}
          className='gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50'
        >
          {busy === 'reminder' ? <Loader2Icon className='size-3.5 animate-spin' /> : <BellRingIcon className='size-3.5' />}
          Send Payment Reminder ({reminderEligible.length})
        </Button>
      )}

      {approveEligible.length > 0 && (
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={busy !== null}
          onClick={bulkApprove}
          className='gap-1.5 border-teal-300 text-teal-800 hover:bg-teal-50'
        >
          {busy === 'approve' ? <Loader2Icon className='size-3.5 animate-spin' /> : <CheckIcon className='size-3.5' />}
          Approve ({approveEligible.length})
        </Button>
      )}

      {rejectEligible.length > 0 && (
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={busy !== null}
          onClick={bulkReject}
          className='gap-1.5 border-red-300 text-red-700 hover:bg-red-50'
        >
          {busy === 'reject' ? <Loader2Icon className='size-3.5 animate-spin' /> : <XIcon className='size-3.5' />}
          Reject ({rejectEligible.length})
        </Button>
      )}

      {auctionEligible.length > 0 && (
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={busy !== null}
          onClick={bulkSelectForAuction}
          className='gap-1.5 border-purple-300 text-purple-800 hover:bg-purple-50'
        >
          {busy === 'auction' ? <Loader2Icon className='size-3.5 animate-spin' /> : <GavelIcon className='size-3.5' />}
          Select for Auction ({auctionEligible.length})
        </Button>
      )}

      {error && <span className='text-xs font-semibold text-destructive'>{error}</span>}
      {message && <span className='text-xs font-semibold text-emerald-700'>{message}</span>}
    </div>
  )
}
