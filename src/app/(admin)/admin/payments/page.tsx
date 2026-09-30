import type { Metadata } from 'next'

import Link from 'next/link'

import { ClockIcon, CreditCardIcon, EyeIcon, SearchIcon, XCircleIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import KpiCard from '@/components/shared/KpiCard'
import TablePagination from '@/components/shared/TablePagination'
import { getPaymentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { maskIdentifier } from '@/lib/security/mask'
import { encodeId } from '@/lib/security/opaque-id'

export const metadata: Metadata = {
  title: 'Payments — IGM Admin Portal'
}

const DEFAULT_PAGE_SIZE = 25

const VALID_SORT_FIELDS: Record<string, string> = {
  date: 'p.created_at',
  amount: 'p.amount_paise',
  status: 'p.status'
}

type PaymentItem = {
  id: number
  application_id: number
  purpose: string
  amount_paise: number
  status: string
  razorpay_order_id: string | null
  created_at: string
  application_number: string
  representative_name: string
  category_name: string
  category_slug: string
}

const PaymentsAdminPage = async ({
  searchParams
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    category?: string
    sort?: string
    dir?: 'asc' | 'desc'
    page?: string
    pageSize?: string
  }>
}) => {
  await requirePermission('payment:view')

  const permissions = await getCurrentUserPermissions()
  const canReconcile = !!permissions?.has('payment:reconcile')

  const { q, status, category, sort = 'date', dir = 'desc', page: pageParam, pageSize: pageSizeParam } =
    await searchParams

  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE)
  const page = pageSize === 'all' ? 1 : Math.max(1, Number(pageParam) || 1)
  const limit = resolveLimit(pageSize)
  const offset = pageSize === 'all' ? 0 : (page - 1) * pageSize

  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('p.status = ?')
    params.push(status)
  }

  if (category && category !== 'all') {
    conditions.push('c.slug = ?')
    params.push(category)
  }

  if (q && q.trim()) {
    conditions.push(
      `(a.application_number LIKE ? OR a.representative_name LIKE ? OR p.razorpay_order_id LIKE ?)`
    )
    const pattern = `%${q.trim()}%`

    params.push(pattern, pattern, pattern)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = VALID_SORT_FIELDS[sort] ?? 'p.created_at'
  const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const [payments, categories, statsRows, countRows] = await Promise.all([
    query<PaymentItem[]>(
      `SELECT p.id, p.application_id, p.purpose, p.amount_paise, p.status, p.razorpay_order_id, p.created_at,
              a.application_number, a.representative_name, c.name AS category_name, c.slug AS category_slug
       FROM payments p
       JOIN applications a ON a.id = p.application_id
       JOIN categories c ON c.id = a.category_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories WHERE status != 'archived' ORDER BY display_order ASC`
    ),
    query<Array<{ status: string; count: number; total_amount: number }>>(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_paise), 0) AS total_amount FROM payments GROUP BY status`
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM payments p JOIN applications a ON a.id = p.application_id JOIN categories c ON c.id = a.category_id ${whereClause}`,
      params
    )
  ])

  const successRow = statsRows.find(r => r.status === 'success')
  const pendingRow = statsRows.find(r => r.status === 'pending')
  const failedRow = statsRows.find(r => r.status === 'failed')
  const totalCollectedPaise = Number(successRow?.total_amount ?? 0)
  const totalFiltered = countRows[0]?.total ?? 0
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize))

  const buildUrl = (overrides: {
    q?: string
    status?: string
    category?: string
    sort?: string
    dir?: string
    page?: number
    pageSize?: number | 'all'
  }) => {
    const sp = new URLSearchParams()
    const merged = { q, status, category, sort, dir, page, pageSize, ...overrides }

    if (merged.q) sp.set('q', merged.q)
    if (merged.status && merged.status !== 'all') sp.set('status', merged.status)
    if (merged.category && merged.category !== 'all') sp.set('category', merged.category)
    if (merged.sort) sp.set('sort', merged.sort)
    if (merged.dir) sp.set('dir', merged.dir)
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(merged.pageSize))
    if (merged.page && merged.page > 1) sp.set('page', String(merged.page))

    const qs = sp.toString()

    return qs ? `/admin/payments?${qs}` : '/admin/payments'
  }

  const getSortUrl = (columnKey: string) => {
    const isCurrent = sort === columnKey
    const nextDir = isCurrent && dir === 'asc' ? 'desc' : 'asc'

    return buildUrl({ sort: columnKey, dir: nextDir, page: 1 })
  }

  const getSortIcon = (columnKey: string) => {
    if (sort !== columnKey) return <span className='ml-1 opacity-30 select-none text-[11px]'>↕</span>

    return dir === 'asc' ? (
      <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↑</span>
    ) : (
      <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↓</span>
    )
  }

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'success', label: 'Success' },
    { key: 'failed', label: 'Failed' },
    { key: 'refunded', label: 'Refunded' }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Payments</h1>
        <p className='text-sm text-muted-foreground'>
          Registration fee payments collected via Razorpay. Reconcile status/date/category against Razorpay
          dashboard records.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <KpiCard
          label='Total Collected'
          value={`₹${(totalCollectedPaise / 100).toLocaleString('en-IN')}`}
          icon={CreditCardIcon}
          accentColor='text-emerald-700'
          hint={`${successRow?.count ?? 0} successful payment(s)`}
        />
        <KpiCard
          label='Pending'
          value={pendingRow?.count ?? 0}
          icon={ClockIcon}
          accentColor='text-amber-700'
          hint='Order created, awaiting checkout'
        />
        <KpiCard
          label='Failed'
          value={failedRow?.count ?? 0}
          icon={XCircleIcon}
          accentColor='text-red-700'
          hint='Signature mismatch or gateway failure'
        />
      </div>

      <div className='flex flex-wrap gap-2'>
        {statusTabs.map(tab => (
          <Link
            key={tab.key}
            href={buildUrl({ status: tab.key, page: 1 })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              (status ?? 'all') === tab.key
                ? 'bg-[#0c2847] text-white'
                : 'border border-border bg-white text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card className='shadow-xs'>
        <CardContent className='pt-6'>
          <form method='GET' className='flex flex-col gap-3 sm:flex-row'>
            <input type='hidden' name='status' value={status ?? 'all'} />
            <input type='hidden' name='sort' value={sort} />
            <input type='hidden' name='dir' value={dir} />

            <div className='relative flex-1'>
              <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                name='q'
                defaultValue={q}
                placeholder='Search by application number, applicant or Razorpay order ID...'
                className='pl-9'
              />
            </div>

            <select
              name='category'
              defaultValue={category ?? 'all'}
              className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background sm:w-56'
            >
              <option value='all'>All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type='submit'
              className='inline-flex items-center justify-center rounded-md bg-[#0c2847] px-4 py-2 text-sm font-semibold text-white hover:bg-[#071f3a] transition'
            >
              Filter
            </button>

            {(q || (category && category !== 'all')) && (
              <Link
                href={buildUrl({ q: '', category: 'all', page: 1 })}
                className='inline-flex items-center justify-center rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted transition'
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Payment Records</CardTitle>
              <CardDescription className='text-xs'>{totalFiltered} record(s)</CardDescription>
            </div>
            <div className='flex gap-3 text-xs font-semibold text-muted-foreground'>
              <Link href={getSortUrl('date')} className='hover:text-[#0c2847] transition'>
                Date {getSortIcon('date')}
              </Link>
              <Link href={getSortUrl('amount')} className='hover:text-[#0c2847] transition'>
                Amount {getSortIcon('amount')}
              </Link>
              <Link href={getSortUrl('status')} className='hover:text-[#0c2847] transition'>
                Status {getSortIcon('status')}
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          {payments.length === 0 ? (
            <div className='py-12 text-center'>
              <CreditCardIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No payment records found.</p>
            </div>
          ) : (
            <div className='divide-y'>
              {payments.map(payment => {
                const cfg = getPaymentStatusConfig(payment.status)

                return (
                  <div key={payment.id} className='flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <Link
                          href={`/admin/applications/${encodeId(payment.application_id)}`}
                          className='font-mono text-sm font-bold text-[#0c2847] hover:underline'
                        >
                          {payment.application_number}
                        </Link>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 capitalize'>
                          {payment.purpose.replace('_', ' ')}
                        </span>
                      </div>
                      <p className='text-sm text-slate-700'>
                        {payment.representative_name} · {payment.category_name}
                      </p>
                      <p className='font-mono text-xs text-muted-foreground'>
                        Order: {canReconcile ? payment.razorpay_order_id ?? '—' : maskIdentifier(payment.razorpay_order_id)}
                      </p>
                    </div>

                    <div className='flex items-center gap-4'>
                      <div className='text-right'>
                        <p className='text-base font-black text-[#0c2847]'>
                          ₹{(payment.amount_paise / 100).toLocaleString('en-IN')}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {new Date(payment.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Link
                        href={`/admin/payments/${encodeId(payment.id)}`}
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
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalFiltered}
          pageSize={pageSize}
          buildUrl={targetPage => buildUrl({ page: targetPage })}
          buildPageSizeUrl={targetSize => buildUrl({ pageSize: targetSize, page: 1 })}
        />
      </Card>
    </div>
  )
}

export default PaymentsAdminPage
