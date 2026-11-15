import type { Metadata } from 'next'

import TablePagination from '@/components/shared/TablePagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { withPooledConnection } from '@/lib/db/client'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import { requirePermission } from '@/lib/rbac/authorize'
import NotificationLogsClient, { type NotificationLogRow } from '@/views/admin/notification-logs/NotificationLogsClient'
import NotificationLogsFilterBar from '@/views/admin/notification-logs/NotificationLogsFilterBar'

export const metadata: Metadata = {
  title: 'Notification Logs — IGM Admin Portal'
}

export const dynamic = 'force-dynamic'

const DEFAULT_PAGE_SIZE = 40

const VALID_SORT_FIELDS: Record<string, string> = {
  when: 'nl.created_at'
}

/**
 * Every WhatsApp/SMS/Email send attempt — success or failure — with filters,
 * search, and a bulk Resend action scoped to failed rows only. Built after a
 * production incident (12-15 Nov 2026) where a missing AiSensy campaign env
 * var silently failed 126 rejection notifications with no admin-visible way
 * to discover or recover from it short of a manual DB query — see
 * .ai/CHANGELOG.md 2026-11-15.
 */
const NotificationLogsPage = async ({
  searchParams
}: {
  searchParams: Promise<{
    status?: string
    channel?: string
    category?: string
    q?: string
    page?: string
    sort?: string
    dir?: 'asc' | 'desc'
    pageSize?: string
  }>
}) => {
  await requirePermission('audit:view')

  const {
    status,
    channel,
    category,
    q,
    page: pageParam,
    sort = 'when',
    dir = 'desc',
    pageSize: pageSizeParam
  } = await searchParams

  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE)
  const page = pageSize === 'all' ? 1 : Math.max(1, Number(pageParam) || 1)
  const limit = resolveLimit(pageSize)
  const offset = pageSize === 'all' ? 0 : (page - 1) * pageSize
  const sortCol = VALID_SORT_FIELDS[sort] ?? 'nl.created_at'
  const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('nl.status = ?')
    params.push(status)
  }

  if (channel && channel !== 'all') {
    conditions.push('nl.channel = ?')
    params.push(channel)
  }

  if (category && category !== 'all') {
    conditions.push('nl.category = ?')
    params.push(category)
  }

  if (q && q.trim()) {
    conditions.push('(nl.destination LIKE ? OR a.application_number LIKE ? OR a.representative_name LIKE ?)')
    const pattern = `%${q.trim()}%`

    params.push(pattern, pattern, pattern)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // All 3 queries share ONE pooled connection instead of each checking out
  // its own — same pattern established this session for the Applications
  // list / Audit Logs-shaped pages.
  const { entries, categories, countRows } = await withPooledConnection(async query => {
    const [entries, categories, countRows] = await Promise.all([
      query<NotificationLogRow[]>(
        `SELECT nl.id, nl.channel, nl.category, nl.destination, nl.campaign_name, nl.status, nl.error_message, nl.created_at,
                a.application_number, a.representative_name
         FROM notification_log nl
         LEFT JOIN applications a ON a.id = nl.application_id
         ${whereClause}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      query<Array<{ category: string }>>(`SELECT DISTINCT category FROM notification_log ORDER BY category ASC`),
      query<Array<{ total: number }>>(
        `SELECT COUNT(*) AS total FROM notification_log nl LEFT JOIN applications a ON a.id = nl.application_id ${whereClause}`,
        params
      )
    ])

    return { entries, categories, countRows }
  })

  const total = countRows[0]?.total ?? 0
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize))

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    const merged = { status, channel, category, q, page: String(page), sort, dir, pageSize: String(pageSize), ...overrides }

    if (merged.status && merged.status !== 'all') sp.set('status', merged.status)
    if (merged.channel && merged.channel !== 'all') sp.set('channel', merged.channel)
    if (merged.category && merged.category !== 'all') sp.set('category', merged.category)
    if (merged.q) sp.set('q', merged.q)
    if (merged.sort && merged.sort !== 'when') sp.set('sort', merged.sort)
    if (merged.dir && merged.dir !== 'desc') sp.set('dir', merged.dir)
    if (merged.pageSize && merged.pageSize !== String(DEFAULT_PAGE_SIZE)) sp.set('pageSize', merged.pageSize)
    if (merged.page && merged.page !== '1') sp.set('page', merged.page)

    const qs = sp.toString()

    return qs ? `/admin/notification-logs?${qs}` : '/admin/notification-logs'
  }

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Notification Logs</h1>
        <p className='text-sm text-muted-foreground'>
          Every WhatsApp/SMS/Email send attempt, success or failure. Select failed rows below to resend.
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardContent className='flex flex-col gap-3 pt-6 sm:flex-row'>
          <NotificationLogsFilterBar
            initialQ={q ?? ''}
            initialStatus={status ?? 'all'}
            initialChannel={channel ?? 'all'}
            initialCategory={category ?? 'all'}
            categories={categories.map(c => c.category)}
          />
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>
            {total} total · page {page} of {totalPages}
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <NotificationLogsClient entries={entries} />
        </CardContent>
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          buildUrl={targetPage => buildUrl({ page: String(targetPage) })}
          buildPageSizeUrl={targetSize => buildUrl({ pageSize: String(targetSize), page: '1' })}
        />
      </Card>
    </div>
  )
}

export default NotificationLogsPage
