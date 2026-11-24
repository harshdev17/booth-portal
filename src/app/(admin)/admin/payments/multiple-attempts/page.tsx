import type { Metadata } from 'next'

import Link from 'next/link'

import { AlertTriangleIcon, ArrowLeftIcon, EyeIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPaymentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { encodeId } from '@/lib/security/opaque-id'

export const metadata: Metadata = {
  title: 'Multiple Payment Attempts — IGM Admin Portal'
}

export const dynamic = 'force-dynamic'

const PURPOSE_LABELS: Record<string, string> = {
  registration: 'Registration Fee',
  pay_now: 'Allotment Payment',
  auction_fee: 'Auction Participation Fee',
  auction_final: 'Auction Final Payment'
}

type Row = {
  payment_id: number
  application_id: number
  application_number: string
  representative_name: string
  category_name: string
  purpose: string
  status: string
  amount_paise: number
  order_count: number
  possible_double_payment: number
  double_payment_order_ids: string | null
}

/**
 * Every payment whose applicant clicked "Pay" more than once (each retry
 * creates a brand-new Razorpay order and overwrites the previous one on the
 * payment row — recordOrderCreated()'s ON DUPLICATE KEY UPDATE). The
 * overwhelming majority of these are harmless (first attempt failed/timed
 * out, retry succeeded) — but a payment with MULTIPLE orders is exactly the
 * shape that caused 4 applicants' genuinely-captured payments to be invisible
 * to this app (confirmed live 2026-11-23: Reconcile only ever checked the
 * payment's CURRENT order_id, not earlier overwritten ones). Reconcile
 * (single or bulk) has since been fixed to check every order_id this page
 * lists, but an admin reviewing this list can also spot a genuine DOUBLE
 * PAYMENT (two different orders both captured for the same payment) that
 * reconcile will flag but not resolve on its own — see
 * payment-bulk-reconcile-actions.ts's possibleDoublePayment audit field.
 */
const MultipleAttemptsPage = async () => {
  await requirePermission('payment:reconcile')

  const rows = await query<Row[]>(
    `SELECT p.id AS payment_id, p.application_id, a.application_number, a.representative_name,
            c.name AS category_name, p.purpose, p.status, p.amount_paise,
            p.possible_double_payment, p.double_payment_order_ids,
            attempt_counts.order_count
     FROM (
       SELECT payment_id, COUNT(DISTINCT razorpay_order_id) AS order_count
       FROM payment_transactions
       WHERE type = 'order_created' AND razorpay_order_id IS NOT NULL
       GROUP BY payment_id
       HAVING order_count > 1
     ) attempt_counts
     JOIN payments p ON p.id = attempt_counts.payment_id
     JOIN applications a ON a.id = p.application_id
     JOIN categories c ON c.id = a.category_id
     ORDER BY p.possible_double_payment DESC, attempt_counts.order_count DESC, p.id DESC
     LIMIT 500`
  )

  const pendingCount = rows.filter(r => r.status !== 'success').length
  const doublePaymentCount = rows.filter(r => r.possible_double_payment).length

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Link href='/admin/payments' className='inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2'>
          <ArrowLeftIcon className='size-3.5' />
          Back to Payments
        </Link>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847] flex items-center gap-2'>
          <AlertTriangleIcon className='size-6 text-amber-600' />
          Multiple Payment Attempts
        </h1>
        <p className='text-sm text-muted-foreground'>
          Payments where the applicant's "Pay" click created more than one Razorpay order — each retry overwrites the
          previous order on the payment record. Most are harmless retries after a failed/slow first attempt, but any
          row still showing as not Successful here should be checked with Reconcile, since the payment may have
          actually succeeded on an earlier order. {rows.length} total, {pendingCount} not yet marked Successful
          {doublePaymentCount > 0 ? `, ${doublePaymentCount} with a confirmed DOUBLE PAYMENT` : ''}.
        </p>
        {doublePaymentCount > 0 && (
          <div className='mt-3 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 flex items-start gap-2'>
            <AlertTriangleIcon className='size-5 shrink-0 text-red-700 mt-0.5' />
            <span>
              <strong>{doublePaymentCount} payment(s) have more than one order confirmed captured on Razorpay</strong> —
              Razorpay itself confirms the applicant was charged twice for the same fee (not a guess). Reconcile
              marked only one order as the official payment; the extra captured amount needs a manual refund decision. Rows below are marked
              in red.
            </span>
          </div>
        )}
      </div>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Payment Records</CardTitle>
          <CardDescription className='text-xs'>{rows.length} record(s)</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {rows.length === 0 ? (
            <div className='py-12 text-center'>
              <p className='text-sm font-semibold text-muted-foreground'>No payments with multiple attempts found.</p>
            </div>
          ) : (
            <div className='divide-y'>
              {rows.map(row => {
                const cfg = getPaymentStatusConfig(row.status)
                const isDoublePayment = Boolean(row.possible_double_payment)
                const doubleOrderIds: string[] = (() => {
                  if (!row.double_payment_order_ids) return []
                  try {
                    return JSON.parse(row.double_payment_order_ids)
                  } catch {
                    return []
                  }
                })()

                return (
                  <div
                    key={row.payment_id}
                    className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isDoublePayment ? 'bg-red-50/70' : ''
                    }`}
                  >
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <Link
                          href={`/admin/applications/${encodeId(row.application_id)}`}
                          className='font-mono text-sm font-bold text-[#0c2847] hover:underline'
                        >
                          {row.application_number}
                        </Link>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                        <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600'>
                          {PURPOSE_LABELS[row.purpose] ?? row.purpose.replace(/_/g, ' ')}
                        </span>
                        <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800'>
                          {row.order_count} orders created
                        </span>
                        {isDoublePayment && (
                          <span className='rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-1'>
                            <AlertTriangleIcon className='size-3' /> Double Payment Confirmed
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-slate-700'>
                        {row.representative_name} · {row.category_name}
                      </p>
                      {isDoublePayment && doubleOrderIds.length > 0 && (
                        <p className='mt-1 font-mono text-[11px] text-red-800'>
                          Captured orders: {doubleOrderIds.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className='flex items-center gap-4'>
                      <p className='text-base font-black text-[#0c2847]'>
                        ₹{(row.amount_paise / 100).toLocaleString('en-IN')}
                      </p>
                      <Link
                        href={`/admin/payments/${encodeId(row.payment_id)}`}
                        className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted transition'
                      >
                        <EyeIcon className='size-3.5' /> View
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MultipleAttemptsPage
