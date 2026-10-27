'use client'

import { useState } from 'react'

import {
  BanIcon,
  BellRingIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PrinterIcon,
  RefreshCwIcon,
  StoreIcon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Props = {
  applicationId: string
  applicationNumber: string
  stallNumber: string | null
  status: string
  paymentAmountPaise: number | null
  paymentStatus: string | null
  allotmentPaidAt: string | null
  canManage: boolean
}

export default function ApplicationAllotmentPaymentCard({
  applicationId,
  applicationNumber,
  stallNumber,
  status,
  paymentAmountPaise,
  paymentStatus,
  allotmentPaidAt,
  canManage
}: Props) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cancelAllotment = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the allotment for this application (Stall: ${stallNumber || '—'})?\n\nThe stall will be released immediately and become available for re-allocation.`
    )
    if (!confirmed) return

    setError(null)
    setMessage(null)
    setCancelling(true)

    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/cancel-allotment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin cancelled from application detail' })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to cancel allotment.')
        return
      }

      setMessage('Allotment cancelled successfully! Refreshing page...')
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setError('Failed to communicate with server.')
    } finally {
      setCancelling(false)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const paymentUrl = `${origin}/status?appNo=${encodeURIComponent(applicationNumber)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  const printLetter = async () => {
    setError(null)
    setPrinting(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/allotment-letter/pdf?format=html`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.error ?? 'Could not load allotment letter for printing.')
        return
      }

      const html = await response.text()
      const frame = document.createElement('iframe')
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      frame.srcdoc = html
      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => frame.remove(), 60_000)
      }
      document.body.appendChild(frame)
    } catch {
      setError('Unable to contact server for printing.')
    } finally {
      setPrinting(false)
    }
  }

  const regenerateLink = async () => {
    setError(null)
    setMessage(null)
    setRegenerating(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/regenerate-payment-link`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to regenerate payment order.')
        return
      }
      setMessage(data.message ?? 'New Razorpay payment order generated successfully.')
    } catch {
      setError('Network error while regenerating payment link.')
    } finally {
      setRegenerating(false)
    }
  }

  const sendReminder = async () => {
    setError(null)
    setMessage(null)
    setSendingReminder(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/send-payment-reminder`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to send reminder.')
        return
      }
      setMessage(data.message ?? 'Payment reminder sent successfully via WhatsApp and Email.')
    } catch {
      setError('Network error while sending reminder.')
    } finally {
      setSendingReminder(false)
    }
  }

  const hasAllotment = Boolean(stallNumber) || status === 'allotted'
  const isPaid = paymentStatus === 'success' || paymentStatus === 'paid'
  const isFree = paymentAmountPaise === 0 || paymentStatus === 'exempt'
  const amountRupees = paymentAmountPaise ? (paymentAmountPaise / 100).toLocaleString('en-IN') : '0'

  return (
    <Card className='border-amber-200/80 bg-amber-50/20 shadow-xs'>
      <CardHeader className='pb-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <StoreIcon className='size-5 text-[#8c5711]' />
            <CardTitle className='text-base font-bold text-[#0c2847]'>
              Allotment &amp; Payment Controls
            </CardTitle>
          </div>
          <div className='flex items-center gap-1.5'>
            {stallNumber && (
              <Badge className='border-blue-300 bg-blue-100 font-mono text-blue-900'>
                Booth/Stall: {stallNumber}
              </Badge>
            )}
            {isPaid ? (
              <Badge className='border-emerald-300 bg-emerald-100 text-emerald-900'>
                Fee Paid (₹{amountRupees})
              </Badge>
            ) : isFree ? (
              <Badge className='border-blue-300 bg-blue-100 text-blue-900'>
                Free / Exempt Allotment
              </Badge>
            ) : (
              <Badge className='border-amber-300 bg-amber-100 text-amber-900'>
                Payment Required (₹{amountRupees})
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Manage official allotment letter printing, copy applicant unique payment link, regenerate orders, and trigger WhatsApp/Email reminders.
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-4 pt-1'>
        {/* Allotment Letter Action */}
        {hasAllotment && (
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3'>
            <div>
              <p className='text-sm font-semibold text-slate-900'>Official Allotment Letter</p>
              <p className='text-xs text-muted-foreground'>
                Download or print the official allotment order with letterhead, ref number, and authority seal.
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={printing}
                onClick={printLetter}
                className='font-semibold text-[#0c2847]'
              >
                {printing ? <Loader2Icon className='animate-spin' /> : <PrinterIcon className='size-4' />}
                Print Allotment Letter
              </Button>
            </div>
          </div>
        )}

        {/* Unique Payment Link & Actions */}
        <div className='rounded-md border border-amber-200/60 bg-white p-3 space-y-3'>
          <div>
            <label className='text-xs font-bold text-slate-800 flex items-center gap-1.5'>
              <CreditCardIcon className='size-3.5 text-[#8c5711]' />
              Applicant Unique Payment &amp; Status Link
            </label>
            <p className='text-[11px] text-muted-foreground'>
              Direct link for this applicant to view status, make online Razorpay payment, and download allotment letter.
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Input
              readOnly
              value={paymentUrl}
              className='h-9 font-mono text-xs bg-slate-50 select-all'
            />
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={copyLink}
              className='shrink-0 gap-1.5'
            >
              {copied ? <CheckIcon className='size-3.5 text-emerald-600' /> : <CopyIcon className='size-3.5' />}
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>

          {canManage && (
            <div className='flex flex-wrap items-center gap-2 pt-1 border-t'>
              {!isPaid && !isFree && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={regenerating}
                  onClick={regenerateLink}
                  className='text-xs gap-1.5'
                >
                  {regenerating ? <Loader2Icon className='animate-spin size-3.5' /> : <RefreshCwIcon className='size-3.5' />}
                  Regenerate Payment Order
                </Button>
              )}

              {/* Hidden per explicit request (2026-10-28) — the underlying
                  WhatsApp template this sends ("Pay Now Activation (Draw)")
                  was worded as if the booth/stall is already allotted and
                  only the fee remains, which is wrong for an application
                  still awaiting payment before allotment is final. Needs the
                  AiSensy template content itself reviewed/corrected before
                  this button comes back — that lives in AiSensy's own
                  dashboard, not this codebase. sendReminder/sendingReminder
                  are left in place, unused, so re-enabling later is a
                  one-line change once the template is fixed. */}
              {false && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={sendingReminder}
                  onClick={sendReminder}
                  className='text-xs gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                >
                  {sendingReminder ? <Loader2Icon className='animate-spin size-3.5' /> : <BellRingIcon className='size-3.5' />}
                  Send WhatsApp &amp; Email Reminder
                </Button>
              )}

              {hasAllotment && (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={cancelling}
                  onClick={cancelAllotment}
                  className='text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                >
                  {cancelling ? <Loader2Icon className='animate-spin size-3.5' /> : <BanIcon className='size-3.5' />}
                  Cancel Allotment
                </Button>
              )}
            </div>
          )}
        </div>

        {error && <p className='text-xs font-semibold text-destructive'>{error}</p>}
        {message && <p className='text-xs font-semibold text-emerald-700'>{message}</p>}
      </CardContent>
    </Card>
  )
}
