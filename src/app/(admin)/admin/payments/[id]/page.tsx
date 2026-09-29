import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArrowLeftIcon, CreditCardIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPaymentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { maskIdentifier } from '@/lib/security/mask'

export const metadata: Metadata = {
  title: 'Payment Details — KDB Admin Portal'
}

type PaymentDetailRow = {
  id: number
  application_id: number
  purpose: string
  amount_paise: number
  status: string
  razorpay_order_id: string | null
  created_at: string
  updated_at: string
  application_number: string
  representative_name: string
  mobile_number: string
  category_name: string
}

type TransactionRow = {
  id: number
  type: string
  amount_paise: number
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  signature_valid: number | null
  failure_reason: string | null
  source: string
  created_at: string
}

const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  order_created: 'Order Created',
  checkout_success: 'Checkout Success (client-verified)',
  checkout_failed: 'Checkout Failed (client-verified)',
  webhook_confirmed: 'Webhook Confirmed',
  webhook_failed: 'Webhook Failed',
  refund: 'Refund'
}

const PaymentDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requirePermission('payment:view')

  const permissions = await getCurrentUserPermissions()
  const canReconcile = !!permissions?.has('payment:reconcile')

  const { id } = await params
  const paymentId = Number(id)

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    notFound()
  }

  const [paymentRows, transactions] = await Promise.all([
    query<PaymentDetailRow[]>(
      `SELECT p.id, p.application_id, p.purpose, p.amount_paise, p.status, p.razorpay_order_id, p.created_at, p.updated_at,
              a.application_number, a.representative_name, a.mobile_number, c.name AS category_name
       FROM payments p
       JOIN applications a ON a.id = p.application_id
       JOIN categories c ON c.id = a.category_id
       WHERE p.id = ? LIMIT 1`,
      [paymentId]
    ),
    query<TransactionRow[]>(
      `SELECT id, type, amount_paise, razorpay_order_id, razorpay_payment_id, signature_valid, failure_reason, source, created_at
       FROM payment_transactions WHERE payment_id = ? ORDER BY created_at DESC`,
      [paymentId]
    )
  ])

  const payment = paymentRows[0]

  if (!payment) {
    notFound()
  }

  const cfg = getPaymentStatusConfig(payment.status)

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Link
          href='/admin/payments'
          className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-[#0c2847] transition'
        >
          <ArrowLeftIcon className='size-3.5' /> Back to Payments
        </Link>
        <h1 className='mt-2 text-2xl font-bold tracking-tight text-[#0c2847]'>Payment Details</h1>
      </div>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>
                <span className='capitalize'>{payment.purpose.replace('_', ' ')}</span> Payment
              </CardTitle>
              <CardDescription className='text-xs'>Payment #{payment.id}</CardDescription>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
          </div>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2'>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Application</p>
            <Link
              href={`/admin/applications/${payment.application_id}`}
              className='font-mono text-sm font-bold text-[#0c2847] hover:underline'
            >
              {payment.application_number}
            </Link>
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Applicant</p>
            <p className='text-sm font-semibold text-slate-800'>{payment.representative_name}</p>
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Category</p>
            <p className='text-sm font-semibold text-slate-800'>{payment.category_name}</p>
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Amount</p>
            <p className='text-sm font-black text-[#0c2847]'>₹{(payment.amount_paise / 100).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Razorpay Order ID</p>
            <p className='font-mono text-sm text-slate-800'>
              {canReconcile ? payment.razorpay_order_id ?? '—' : maskIdentifier(payment.razorpay_order_id)}
            </p>
          </div>
          <div>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Created</p>
            <p className='text-sm text-slate-800'>{new Date(payment.created_at).toLocaleString('en-IN')}</p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Transaction History</CardTitle>
          <CardDescription className='text-xs'>
            Every attempt against this payment — order creation, checkout result, webhook confirmation. Append-only,
            never edited.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {transactions.length === 0 ? (
            <div className='py-10 text-center'>
              <CreditCardIcon className='mx-auto size-8 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No transactions recorded yet.</p>
            </div>
          ) : (
            <div className='divide-y'>
              {transactions.map(tx => (
                <div key={tx.id} className='flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-bold text-slate-800'>
                        {TRANSACTION_TYPE_LABEL[tx.type] ?? tx.type}
                      </span>
                      <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize'>
                        {tx.source}
                      </span>
                      {tx.signature_valid !== null && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            tx.signature_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.signature_valid ? 'Signature Valid' : 'Signature Invalid'}
                        </span>
                      )}
                    </div>
                    <p className='font-mono text-xs text-muted-foreground'>
                      Order: {canReconcile ? tx.razorpay_order_id ?? '—' : maskIdentifier(tx.razorpay_order_id)}
                      {tx.razorpay_payment_id && (
                        <>
                          {' · '}
                          Payment: {canReconcile ? tx.razorpay_payment_id : maskIdentifier(tx.razorpay_payment_id)}
                        </>
                      )}
                    </p>
                    {tx.failure_reason && <p className='mt-1 text-xs text-red-700'>Reason: {tx.failure_reason}</p>}
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-bold text-slate-800'>₹{(tx.amount_paise / 100).toLocaleString('en-IN')}</p>
                    <p className='text-xs text-muted-foreground'>{new Date(tx.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentDetailPage
