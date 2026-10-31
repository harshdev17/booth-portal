'use client'

import { useState } from 'react'
import {
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  CheckIcon,
  CreditCardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InfoIcon,
  PrinterIcon,
  ShieldCheckIcon,
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

type Props = {
  applicationId: string
  applicationNumber: string
  applicantName: string
  mobileNumber: string
  email: string
  categoryName: string
  categoryFeePaise: number
  gstPercent: number
  payment: {
    id: number
    amount_paise: number
    status: string
    razorpay_order_id: string | null
    created_at: string
    updated_at: string
  } | null
  transactions: TransactionItem[]
  canManage: boolean
}

export default function ApplicationRegistrationPaymentTab({
  applicationId,
  applicationNumber,
  categoryName,
  categoryFeePaise,
  gstPercent,
  payment,
  transactions,
  canManage: _canManage
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedOrder, setCopiedOrder] = useState(false)
  const [copiedPayment, setCopiedPayment] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const paymentUrl = `${origin}/status?appNo=${encodeURIComponent(applicationNumber)}`

  const isFree = categoryFeePaise === 0 || payment?.status === 'exempt'
  const isPaid = payment?.status === 'success' || payment?.status === 'paid'
  const isPending = !isFree && (!payment || payment.status === 'pending' || payment.status === 'not_initiated')
  const isFailed = payment?.status === 'failed'

  // Calculations
  const baseFeeRupees = categoryFeePaise / 100
  const gstRate = gstPercent || 18
  const gstAmountRupees = Math.round((baseFeeRupees * gstRate) / 100)
  const totalDueRupees = baseFeeRupees + gstAmountRupees
  const actualPaidRupees = payment?.amount_paise ? payment.amount_paise / 100 : totalDueRupees

  // Latest payment id from transactions
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

  const printReceipt = async () => {
    setError(null)
    setPrinting(true)
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/receipt/pdf?format=html`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body.error ?? 'Could not load receipt for printing.')
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
      setError('Unable to contact server for receipt printing.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {error && (
        <div className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800'>
          {error}
        </div>
      )}

      {/* Overview Cards Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        {/* Card 1: Payment Status & Amount */}
        <Card className='border-slate-200 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Registration Fee Status
              </span>
              {isPaid ? (
                <Badge className='border-emerald-300 bg-emerald-50 text-emerald-800'>
                  <CheckCircle2Icon className='mr-1 size-3 text-emerald-600' />
                  Paid &amp; Confirmed
                </Badge>
              ) : isFree ? (
                <Badge className='border-blue-300 bg-blue-50 text-blue-800'>
                  <InfoIcon className='mr-1 size-3 text-blue-600' />
                  Free / Exempt
                </Badge>
              ) : isFailed ? (
                <Badge className='border-red-300 bg-red-50 text-red-800'>
                  <XCircleIcon className='mr-1 size-3 text-red-600' />
                  Payment Failed
                </Badge>
              ) : (
                <Badge className='border-amber-300 bg-amber-50 text-amber-800'>
                  <ClockIcon className='mr-1 size-3 text-amber-600' />
                  Payment Pending
                </Badge>
              )}
            </div>
            <CardTitle className='text-2xl font-extrabold text-[#0c2847] pt-1'>
              ₹{isFree ? '0.00' : actualPaidRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </CardTitle>
            <CardDescription className='text-xs'>
              {isFree ? 'Exempt under category terms' : `Base Fee: ₹${baseFeeRupees} + GST (${gstRate}%): ₹${gstAmountRupees}`}
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-1'>
            <div className='text-xs text-muted-foreground space-y-1'>
              <p className='flex justify-between'>
                <span>Category:</span>
                <span className='font-semibold text-slate-800'>{categoryName}</span>
              </p>
              <p className='flex justify-between'>
                <span>Obligation Purpose:</span>
                <span className='font-semibold text-slate-800'>Application Scrutiny Fee</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Razorpay Gateway Particulars */}
        <Card className='border-slate-200 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center gap-1.5'>
              <CreditCardIcon className='size-4 text-[#8c5711]' />
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Gateway Transaction
              </span>
            </div>
            <CardTitle className='text-sm font-bold text-slate-900'>
              {payment?.razorpay_order_id ? 'Razorpay Payment Gateway' : isFree ? 'Not Applicable (Exempt)' : 'Gateway Order Pending'}
            </CardTitle>
            <CardDescription className='text-xs'>
              {payment?.created_at
                ? `Initiated: ${new Date(payment.created_at).toLocaleString('en-IN')}`
                : 'No online payment attempt made'}
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

        {/* Card 3: Quick Receipts & Documents */}
        <Card className='border-slate-200 shadow-xs'>
          <CardHeader className='pb-2'>
            <div className='flex items-center gap-1.5'>
              <FileTextIcon className='size-4 text-[#8c5711]' />
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                Receipt Actions
              </span>
            </div>
            <CardTitle className='text-sm font-bold text-slate-900'>
              Official Payment Receipt
            </CardTitle>
            <CardDescription className='text-xs'>
              Download or print official payment receipt for registration fee.
            </CardDescription>
          </CardHeader>
          <CardContent className='pt-2 flex flex-col gap-2'>
            {isPaid ? (
              <>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={printReceipt}
                  disabled={printing}
                  className='w-full font-semibold text-[#0c2847]'
                >
                  <PrinterIcon className='mr-1.5 size-3.5' />
                  {printing ? 'Preparing Receipt...' : 'Print Receipt'}
                </Button>
                <a
                  href={`/api/admin/applications/${applicationId}/receipt/pdf`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-accent transition'
                >
                  <DownloadIcon className='mr-1.5 size-3.5' />
                  Download PDF Receipt
                </a>
              </>
            ) : isFree ? (
              <p className='text-xs text-muted-foreground italic py-2'>
                Registration fee is exempt for this category. No payment receipt issued.
              </p>
            ) : (
              <div className='space-y-2 py-1'>
                <p className='text-xs text-amber-800'>
                  Payment is not completed. You can share the applicant payment link.
                </p>
                <div className='flex items-center gap-1.5'>
                  <Input
                    readOnly
                    value={paymentUrl}
                    className='h-7 text-[11px] font-mono bg-slate-50'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-7 px-2'
                    onClick={() => copyToClipboard(paymentUrl, 'link')}
                  >
                    {copiedLink ? <CheckIcon className='size-3 text-emerald-600' /> : <CopyIcon className='size-3' />}
                  </Button>
                  <a
                    href={paymentUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex h-7 items-center justify-center rounded-md border border-input bg-background px-2 text-slate-700 hover:bg-accent'
                    title='Open Applicant Payment Link'
                  >
                    <ExternalLinkIcon className='size-3' />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gateway Transaction History Table */}
      <Card className='border-slate-200 shadow-xs'>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <ShieldCheckIcon className='size-4 text-[#8c5711]' />
            <CardTitle className='text-base font-bold text-[#0c2847]'>
              Registration Payment Gateway Transactions
            </CardTitle>
          </div>
          <CardDescription className='text-xs'>
            Complete immutable transaction history and webhook logs recorded for this registration payment.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {transactions.length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              No gateway transactions logged for this application yet.
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
