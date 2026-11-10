'use client'

import { useState } from 'react'
import {
  BanIcon,
  BellRingIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CreditCardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  InfoIcon,
  Loader2Icon,
  PrinterIcon,
  ShieldCheckIcon,
  StoreIcon,
  XCircleIcon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type TransactionItem = {
  id: number
  type: string
  amount_paise: number
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  signature_valid: number | null
  failure_reason: string | null
  source: string
  webhook_event_id: string | null
  created_at: string
}

type DrawAllocationInfo = {
  draw_code: string
  draw_position: number
  allocation_type: string
  completed_at: string | null
} | null

type Props = {
  applicationId: string
  applicationNumber: string
  categoryName: string
  selectionMethod: string
  stallNumber: string | null
  status: string
  expectedAmountPaise: number | null
  allotmentAmountNote: string | null
  payment: {
    id: number
    amount_paise: number
    status: string
    razorpay_order_id: string | null
    created_at: string
    updated_at: string
  } | null
  transactions: TransactionItem[]
  drawAllocation?: DrawAllocationInfo
  canManage: boolean
}

export default function ApplicationAllotmentPaymentTab({
  applicationId,
  applicationNumber,
  categoryName,
  selectionMethod,
  stallNumber,
  status,
  expectedAmountPaise,
  allotmentAmountNote,
  payment,
  transactions,
  drawAllocation,
  canManage: _canManage
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedOrder, setCopiedOrder] = useState(false)
  const [copiedPayment, setCopiedPayment] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const paymentUrl = `${origin}/status?appNo=${encodeURIComponent(applicationNumber)}`

  const hasAllotment = Boolean(stallNumber) || status === 'allotted' || status === 'payment_required'
  const isDraw = selectionMethod === 'draw_of_lots' || selectionMethod === 'lucky_draw' || Boolean(drawAllocation)

  // Status & payment calculation
  const paymentStatus = payment?.status ?? (status === 'allotted' && !expectedAmountPaise ? 'exempt' : 'pending')
  const isPaid = paymentStatus === 'success' || paymentStatus === 'paid'
  const isFree = (expectedAmountPaise === 0 || allotmentAmountNote?.toLowerCase().includes('free')) && !isPaid
  const isPending = !isPaid && !isFree && hasAllotment

  const amountPaise = payment?.amount_paise ?? expectedAmountPaise ?? 0
  const amountRupees = (amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  // Successful transaction info
  const successfulTx = transactions.find(t => t.type === 'checkout_success' || t.type === 'webhook_confirmed')
  const razorpayPaymentId = successfulTx?.razorpay_payment_id || null

  const copyToClipboard = async (text: string, type: 'link' | 'order' | 'payment') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else if (type === 'order') {
        setCopiedOrder(true)
        setTimeout(() => setCopiedOrder(false), 2000)
      } else {
        setCopiedPayment(true)
        setTimeout(() => setCopiedPayment(false), 2000)
      }
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  const printAllotmentLetter = async () => {
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
      setError('Unable to contact server for allotment letter printing.')
    } finally {
      setPrinting(false)
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
      setError('Network error while sending payment reminder.')
    } finally {
      setSendingReminder(false)
    }
  }

  const cancelAllotment = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the stall allotment for this application (Stall: ${stallNumber || '—'})?\n\nThe stall will be released immediately and become available for re-allocation.`
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

  return (
    <div className='flex flex-col gap-6'>
      {message && (
        <div className='rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 font-medium'>
          {message}
        </div>
      )}
      {error && (
        <div className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 font-medium'>
          {error}
        </div>
      )}

      {/* Category Method & Draw Context Banner */}
      <div className='rounded-lg border border-slate-200 bg-slate-50/70 p-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <span className='text-xs font-bold uppercase tracking-wider text-[#8c5711]'>
                {isDraw ? 'Draw Allocation Category' : 'Direct Allotment Category'}
              </span>
              <Badge variant='outline' className='text-xs font-semibold border-slate-300'>
                {categoryName}
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground'>
              {isDraw
                ? 'Allotment payment is activated for candidates selected in the official Draw Process upon stall allocation.'
                : 'Allotment payment is processed as per official category schedule or exempted if government/free quota.'}
            </p>
          </div>

          {drawAllocation && (
            <div className='flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-1.5 shadow-2xs'>
              <div className='text-right'>
                <p className='text-[10px] uppercase font-bold text-muted-foreground'>Draw Event</p>
                <p className='font-mono text-xs font-bold text-[#0c2847]'>{drawAllocation.draw_code}</p>
              </div>
              <div className='border-l border-slate-200 pl-2 text-right'>
                <p className='text-[10px] uppercase font-bold text-muted-foreground'>Position</p>
                <Badge className='bg-[#0c2847] text-white font-mono text-xs'>
                  #{drawAllocation.draw_position}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {/* Card 1: Allotted Stall Particulars */}
        <Card className='border-slate-200 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Allotted Booth / Stall
              </span>
              {stallNumber ? (
                <Badge className='border-blue-300 bg-blue-100 font-mono text-blue-900'>
                  Stall: {stallNumber}
                </Badge>
              ) : (
                <Badge variant='outline' className='text-muted-foreground'>
                  Not Allocated
                </Badge>
              )}
            </div>
            <CardTitle className='text-2xl font-extrabold text-[#0c2847] pt-1'>
              {stallNumber || 'Pending Allotment'}
            </CardTitle>
            <CardDescription className='text-xs'>
              {stallNumber
                ? isDraw
                  ? 'Allocated through official Draw of Lots'
                  : 'Allocated via Direct Administration Allotment'
                : 'Awaiting draw results or administrative allotment'}
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-1 space-y-1 text-xs text-muted-foreground'>
            <p className='flex justify-between'>
              <span>Allocation Status:</span>
              <span className='font-semibold text-slate-800 capitalize'>{status.replace('_', ' ')}</span>
            </p>
            {drawAllocation && (
              <p className='flex justify-between'>
                <span>Draw Position:</span>
                <span className='font-mono font-semibold text-slate-800'>#{drawAllocation.draw_position}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Allotment Fee Status */}
        <Card className='border-slate-200 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Allotment Amount
              </span>
              {isPaid ? (
                <Badge className='border-emerald-300 bg-emerald-50 text-emerald-800'>
                  <CheckCircle2Icon className='mr-1 size-3 text-emerald-600' />
                  Fee Paid
                </Badge>
              ) : isFree ? (
                <Badge className='border-blue-300 bg-blue-50 text-blue-800'>
                  <InfoIcon className='mr-1 size-3 text-blue-600' />
                  Free / Exempt
                </Badge>
              ) : isPending ? (
                <Badge className='border-amber-300 bg-amber-50 text-amber-800'>
                  <ClockIcon className='mr-1 size-3 text-amber-600' />
                  Payment Due
                </Badge>
              ) : (
                <Badge variant='outline' className='text-muted-foreground'>
                  Not Applicable
                </Badge>
              )}
            </div>
            <CardTitle className='text-2xl font-extrabold text-[#0c2847] pt-1'>
              ₹{isFree ? '0.00' : amountRupees}
            </CardTitle>
            <CardDescription className='text-xs'>
              {allotmentAmountNote || (isFree ? 'Exempt / Free Stall' : 'Official Booth/Stall Fee (Incl. GST)')}
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-1 space-y-1 text-xs text-muted-foreground'>
            <p className='flex justify-between'>
              <span>Obligation Purpose:</span>
              <span className='font-semibold text-slate-800'>Booth Allotment Fee</span>
            </p>
            <p className='flex justify-between'>
              <span>Payment Gateway:</span>
              <span className='font-semibold text-slate-800'>{isFree ? 'None (Exempt)' : 'Razorpay'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Gateway Order Details */}
        <Card className='border-slate-200 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center gap-1.5'>
              <CreditCardIcon className='size-4 text-[#8c5711]' />
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Allotment Gateway Order
              </span>
            </div>
            <CardTitle className='text-sm font-bold text-slate-900'>
              {payment?.razorpay_order_id ? 'Razorpay Order Created' : isFree ? 'Exempt from Payment' : 'Order Not Generated'}
            </CardTitle>
            <CardDescription className='text-xs'>
              {payment?.updated_at
                ? `Last Updated: ${new Date(payment.updated_at).toLocaleString('en-IN')}`
                : 'Awaiting order initiation'}
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-1 space-y-2 text-xs'>
            <div>
              <span className='text-muted-foreground block text-[11px]'>Order ID:</span>
              <div className='flex items-center gap-1.5'>
                <span className='font-mono font-medium text-slate-800 truncate'>
                  {payment?.razorpay_order_id || '—'}
                </span>
                {payment?.razorpay_order_id && (
                  <button
                    type='button'
                    onClick={() => copyToClipboard(payment.razorpay_order_id!, 'order')}
                    className='text-muted-foreground hover:text-slate-900'
                    title='Copy Order ID'
                  >
                    {copiedOrder ? <CheckIcon className='size-3 text-emerald-600' /> : <CopyIcon className='size-3' />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className='text-muted-foreground block text-[11px]'>Payment ID:</span>
              <div className='flex items-center gap-1.5'>
                <span className='font-mono font-medium text-slate-800 truncate'>
                  {razorpayPaymentId || '—'}
                </span>
                {razorpayPaymentId && (
                  <button
                    type='button'
                    onClick={() => copyToClipboard(razorpayPaymentId, 'payment')}
                    className='text-muted-foreground hover:text-slate-900'
                    title='Copy Payment ID'
                  >
                    {copiedPayment ? <CheckIcon className='size-3 text-emerald-600' /> : <CopyIcon className='size-3' />}
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Action & Allotment Controls */}
      <Card className='border-amber-200/80 bg-amber-50/20 shadow-xs'>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <StoreIcon className='size-5 text-[#8c5711]' />
            <CardTitle className='text-base font-bold text-[#0c2847]'>
              Allotment Payment &amp; Communication Controls
            </CardTitle>
          </div>
          <CardDescription className='text-xs'>
            Manage applicant payment reminders, direct status payment links, and official letter downloads.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 pt-1'>
          {/* Action Row 1: Allotment Letter */}
          {hasAllotment && (
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3'>
              <div>
                <p className='text-sm font-semibold text-slate-900'>Official Allotment Letter</p>
                <p className='text-xs text-muted-foreground'>
                  Download or print the official allotment order with board letterhead, reference number, and authority signature.
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={printing}
                  onClick={printAllotmentLetter}
                  className='font-semibold text-[#0c2847]'
                >
                  {printing ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <PrinterIcon className='size-3.5 mr-1.5' />}
                  Print Allotment Letter
                </Button>
                <a
                  href={`/api/admin/applications/${applicationId}/allotment-letter/pdf`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-accent transition'
                >
                  <DownloadIcon className='mr-1.5 size-3.5' />
                  Download PDF
                </a>
              </div>
            </div>
          )}

          {/* Action Row 2: Unique Payment Link & Sharing */}
          <div className='rounded-md border border-amber-200/70 bg-white p-3 space-y-3'>
            <div>
              <label className='text-xs font-bold text-slate-800 flex items-center gap-1.5'>
                <CreditCardIcon className='size-3.5 text-[#8c5711]' />
                Applicant Unique Payment &amp; Status Link
              </label>
              <p className='text-[11px] text-muted-foreground'>
                Direct link for applicant to review allotment details, complete online Razorpay payment, and download possession slip.
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
                variant='outline'
                size='sm'
                onClick={() => copyToClipboard(paymentUrl, 'link')}
                className='font-semibold text-[#0c2847] shrink-0'
              >
                {copiedLink ? <CheckIcon className='size-3.5 text-emerald-600 mr-1.5' /> : <CopyIcon className='size-3.5 mr-1.5' />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </Button>
              <a
                href={paymentUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-semibold text-slate-800 shadow-xs hover:bg-accent shrink-0 transition'
              >
                <ExternalLinkIcon className='size-3.5 mr-1.5' />
                Open
              </a>
            </div>

            {/* Communication & Order Actions */}
            <div className='flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100'>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={sendingReminder || isPaid || isFree}
                  onClick={sendReminder}
                  className='font-semibold text-[#0c2847]'
                >
                  {sendingReminder ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <BellRingIcon className='size-3.5 mr-1.5' />}
                  Send Payment Reminder
                </Button>
              </div>

              {hasAllotment && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={cancelling}
                  onClick={cancelAllotment}
                  className='border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800'
                >
                  {cancelling ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <BanIcon className='size-3.5 mr-1.5' />}
                  Cancel Stall Allotment
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gateway Transaction History Table */}
      <Card className='border-slate-200 shadow-xs'>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <ShieldCheckIcon className='size-4 text-[#8c5711]' />
            <CardTitle className='text-base font-bold text-[#0c2847]'>
              Allotment Payment Gateway Transactions
            </CardTitle>
          </div>
          <CardDescription className='text-xs'>
            Immutable transaction records and webhook confirmations logged for this stall allotment payment.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {transactions.length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              No gateway transactions logged for stall allotment payment yet.
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-slate-50/70'>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Date &amp; Time (IST)</TableHead>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Event Type</TableHead>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Amount</TableHead>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Order ID</TableHead>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Payment ID</TableHead>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Source</TableHead>
                    <TableHead className='text-xs font-bold text-[#0c2847]'>Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id} className='text-xs'>
                      <TableCell className='font-mono whitespace-nowrap text-slate-600'>
                        {new Date(tx.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={
                            tx.type === 'checkout_success' || tx.type === 'webhook_confirmed'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : tx.type === 'order_created'
                                ? 'border-blue-300 bg-blue-50 text-blue-800'
                                : 'border-red-300 bg-red-50 text-red-800'
                          }
                        >
                          {tx.type}
                        </Badge>
                        {tx.failure_reason && (
                          <span className='block text-[11px] text-red-600 mt-0.5 truncate max-w-[200px]' title={tx.failure_reason}>
                            {tx.failure_reason}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='font-semibold text-slate-900'>
                        ₹{(tx.amount_paise / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className='font-mono text-[11px] text-slate-700'>
                        {tx.razorpay_order_id || '—'}
                      </TableCell>
                      <TableCell className='font-mono text-[11px] text-slate-700'>
                        {tx.razorpay_payment_id || '—'}
                      </TableCell>
                      <TableCell className='capitalize text-muted-foreground'>
                        {tx.source}
                      </TableCell>
                      <TableCell>
                        {tx.signature_valid === 1 ? (
                          <span className='inline-flex items-center text-emerald-700 font-medium text-[11px]'>
                            <CheckCircle2Icon className='mr-1 size-3' /> Verified
                          </span>
                        ) : tx.signature_valid === 0 ? (
                          <span className='inline-flex items-center text-red-700 font-medium text-[11px]'>
                            <XCircleIcon className='mr-1 size-3' /> Invalid
                          </span>
                        ) : (
                          <span className='text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
