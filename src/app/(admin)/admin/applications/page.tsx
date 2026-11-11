import type { Metadata } from 'next'

import Link from 'next/link'

import { CheckCircle2Icon, ClockIcon, FileTextIcon, ListOrderedIcon, ShieldCheckIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import KpiCard from '@/components/shared/KpiCard'
import TablePagination from '@/components/shared/TablePagination'
import { query } from '@/lib/db/client'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { encodeId } from '@/lib/security/opaque-id'
import ApplicationsFilterBar from '@/views/admin/applications/ApplicationsFilterBar'
import ApplicationsTableClient, { type ApplicationTableRow } from '@/views/admin/applications/ApplicationsTableClient'
import ExportApplicationsButton from '@/views/admin/applications/ExportApplicationsButton'

const DEFAULT_PAGE_SIZE = 25

export const metadata: Metadata = {
  title: 'Applications Management — IGM Admin Portal'
}

type ApplicationItem = {
  id: number
  application_number: string
  category_name: string
  category_slug: string
  organisation_name: string
  representative_name: string
  mobile_number: string
  email: string
  status: string
  open_queries: number
  reuploaded_pending: number
  fee_paise: number | null
  submitted_at: string | null
  created_at: string
  stall_number: string | null
  draw_allocation_type: 'allotted' | 'waitlist' | null
  waitlist_position: number | null
  allotted_at: string | null
  allotment_payment_status: string
  allotment_payment_amount_paise: number | null
  registration_payment_status: string | null
  is_direct_allotment: number
}

export type ApplicationDocumentSummary = {
  id: number
  label: string
  verification_status: string
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  draft: { label: 'Draft', variant: 'outline', color: 'bg-slate-100 text-slate-700' },
  payment_pending: { label: 'Payment Pending', variant: 'secondary', color: 'bg-amber-100 text-amber-800' },
  payment_success: { label: 'Under Review', variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
  query_raised: { label: 'Query Raised', variant: 'secondary', color: 'bg-orange-100 text-orange-800' },
  approved: { label: 'Approved for Draw', variant: 'default', color: 'bg-emerald-100 text-emerald-800' },
  selected: { label: 'Selected / Allotted', variant: 'default', color: 'bg-purple-100 text-purple-800' },
  rejected: { label: 'Rejected', variant: 'destructive', color: 'bg-red-100 text-red-800' },
  allotted: { label: 'Allotted', variant: 'default', color: 'bg-teal-100 text-teal-800' }
}

// Quick-filter tabs: the `status` URL param maps to one or more stored statuses
const QUICK_FILTERS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: 'under_review', label: 'Under Review', statuses: ['under_review', 'payment_success'] },
  { key: 'approved', label: 'Approved for Draw', statuses: ['approved'] },
  { key: 'query_raised', label: 'Query Raised', statuses: ['query_raised'] },
  { key: 'selected', label: 'Allotted / Selected', statuses: ['selected', 'allotted', 're_allotted'] },
  { key: 'waitlist', label: 'Waitlist', statuses: [] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected', 'not_selected', 'cancelled'] },

  // Added per explicit request (2026-10-28): the sidebar's per-category
  // count (admin/layout.tsx's getCachedCategoryCounts) counts every
  // non-draft application, INCLUDING payment_pending/payment_failed ones —
  // but this page's "All" view and every other tab deliberately excluded
  // them (see the `else` branch below), so a category with only an
  // unpaid/abandoned-at-payment application showed a sidebar badge of "1"
  // next to a "0 results" list, with no way to ever see that one row. This
  // tab surfaces them instead of hiding them, so the two numbers can agree.
  { key: 'payment_pending', label: 'Payment Pending', statuses: ['payment_pending', 'payment_failed'] }
]

const VALID_SORT_FIELDS: Record<string, string> = {
  app_no: 'a.application_number',
  name: 'a.representative_name',
  category: 'c.name',
  date: 'a.created_at',
  status: 'a.status'
}

const ApplicationsAdminPage = async ({
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
  // Authorize server-side
  await requirePermission('application:view')
  const permissions = await getCurrentUserPermissions()

  const { q, status, category, sort = 'date', dir = 'desc', page: pageParam, pageSize: pageSizeParam } =
    await searchParams

  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE)
  const page = pageSize === 'all' ? 1 : Math.max(1, Number(pageParam) || 1)
  const limit = resolveLimit(pageSize)
  const offset = pageSize === 'all' ? 0 : (page - 1) * pageSize

  const conditions: string[] = []
  const params: unknown[] = []

  // Exclude raw draft applications that were abandoned without submission
  // unless specifically queried — a draft never shows anywhere, including
  // "All". payment_pending/payment_failed applications DO show in "All"
  // (per explicit request, 2026-10-28) as well as their own dedicated
  // "Payment Pending" tab below — only 'draft' is hidden by default.
  const tab = QUICK_FILTERS.find(f => f.key === status)

  if (tab?.key === 'waitlist') {
    conditions.push(
      `EXISTS (SELECT 1 FROM draw_allocations waitlist_allocation
        WHERE waitlist_allocation.application_id = a.id
          AND waitlist_allocation.allocation_type = 'waitlist'
          AND waitlist_allocation.status = 'allotted')`
    )
  } else if (tab) {
    conditions.push(`a.status IN (${tab.statuses.map(() => '?').join(', ')})`)
    params.push(...tab.statuses)
  } else {
    conditions.push(`a.status != 'draft'`)
  }

  if (category && category !== 'all') {
    conditions.push(`c.slug = ?`)
    params.push(category)
  }

  if (q && q.trim()) {
    conditions.push(
      `(a.application_number LIKE ? OR a.representative_name LIKE ? OR a.organisation_name LIKE ? OR a.mobile_number LIKE ? OR a.email LIKE ?)`
    )
    const searchPattern = `%${q.trim()}%`

    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // KPI and quick-filter totals follow the selected category, but not a
  // free-text or current-status filter, so they show the whole category
  // workload. Only 'draft' (abandoned mid-fill, before payment even started)
  // is excluded — matches `conditions`' own "All" default above, so the
  // "All" tab's own count and list agree, and so does the sidebar's
  // per-category count (admin/layout.tsx's getCachedCategoryCounts).
  const statsConditions = ["a.status != 'draft'"]
  const statsParams: unknown[] = []

  if (category && category !== 'all') {
    statsConditions.push('c.slug = ?')
    statsParams.push(category)
  }

  const statsWhereClause = `WHERE ${statsConditions.join(' AND ')}`

  // Validate sort parameters safely against whitelist
  const sortCol = VALID_SORT_FIELDS[sort] ?? 'a.created_at'
  const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const [applications, categories, statsRows, countRows, waitlistRows] = await Promise.all([
    query<ApplicationItem[]>(
      `SELECT a.id, a.application_number, c.name AS category_name, c.slug AS category_slug,
              a.organisation_name, a.representative_name, a.mobile_number, a.email,
              a.status, c.fee_paise, a.submitted_at, a.created_at,
              su.stall_number,
              latest_draw.allocation_type AS draw_allocation_type,
              latest_draw.waitlist_position,
              latest_draw.created_at AS allotted_at,
              COALESCE(allotment_payment.status, 'not_activated') AS allotment_payment_status,
              COALESCE(allotment_payment.amount_paise, c.allotment_amount_paise) AS allotment_payment_amount_paise,
              registration_payment.status AS registration_payment_status,
              (da.id IS NOT NULL) AS is_direct_allotment,
              (SELECT COUNT(*) FROM application_documents d
                WHERE d.application_id = a.id AND d.verification_status = 'query') AS open_queries,
              (SELECT COUNT(*) FROM application_documents d
                WHERE d.application_id = a.id AND d.reuploaded_at IS NOT NULL AND d.verification_status = 'pending') AS reuploaded_pending
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN draw_allocations latest_draw ON latest_draw.id = (
         SELECT allocation_lookup.id FROM draw_allocations allocation_lookup
         WHERE allocation_lookup.application_id = a.id
         ORDER BY allocation_lookup.id DESC LIMIT 1
       )
       LEFT JOIN payments allotment_payment
         ON allotment_payment.application_id = a.id AND allotment_payment.purpose = 'pay_now'
       LEFT JOIN payments registration_payment
         ON registration_payment.application_id = a.id AND registration_payment.purpose = 'registration'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories WHERE status != 'archived' ORDER BY display_order ASC`
    ),
    query<Array<{ status: string; count: number }>>(
      `SELECT a.status, COUNT(*) AS count
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       ${statsWhereClause}
       GROUP BY a.status`,
      statsParams
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM applications a JOIN categories c ON c.id = a.category_id ${whereClause}`,
      params
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(DISTINCT a.id) AS total
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       JOIN draw_allocations da ON da.application_id = a.id
       ${statsWhereClause} AND da.allocation_type = 'waitlist' AND da.status = 'allotted'`,
      statsParams
    )
  ])

  // Only this page's rows' documents — so "Raise Query" from the list can
  // offer a document picker (per explicit request) without loading every
  // application's documents up front. Grouped client-side below, not via
  // GROUP_CONCAT, so each row keeps its own label/verification_status.
  const applicationIds = applications.map(app => app.id)
  const documentRows =
    applicationIds.length > 0
      ? await query<Array<{ application_id: number; id: number; label: string; verification_status: string }>>(
          `SELECT ad.application_id, ad.id, cdd.label, ad.verification_status
           FROM application_documents ad
           JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
           WHERE ad.application_id IN (${applicationIds.map(() => '?').join(', ')})
           ORDER BY cdd.display_order ASC`,
          applicationIds
        )
      : []

  const documentsByApplicationId = new Map<number, ApplicationDocumentSummary[]>()

  for (const row of documentRows) {
    const list = documentsByApplicationId.get(row.application_id) ?? []

    list.push({ id: row.id, label: row.label, verification_status: row.verification_status })
    documentsByApplicationId.set(row.application_id, list)
  }

  // "All" now includes payment_pending/payment_failed too (matches its own
  // list query's `conditions` above, which only excludes 'draft') — no
  // filtering needed here, statsRows already excludes only 'draft'.
  const totalSubmitted = statsRows.reduce((acc, row) => acc + Number(row.count), 0)
  const getStatusCount = (statuses: string[]) =>
    statsRows.filter(row => statuses.includes(row.status)).reduce((total, row) => total + Number(row.count), 0)
  const pendingCount = getStatusCount(['under_review', 'payment_success'])
  const approvedCount = getStatusCount(['approved'])
  const selectedCount = getStatusCount(['selected', 'allotted', 're_allotted'])
  const waitlistCount = Number(waitlistRows[0]?.total ?? 0)
  const totalFiltered = countRows[0]?.total ?? 0
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize))
  const selectedCategory = categories.find(item => item.slug === category)
  const statsScopeHint = selectedCategory
    ? `Within ${selectedCategory.name}`
    : 'Submitted across all commercial booth/stall categories'

  // Helper to construct sorting links with current search/filter state preserved
  const getSortUrl = (columnKey: string) => {
    const isCurrent = sort === columnKey
    const nextDir = isCurrent && dir === 'asc' ? 'desc' : 'asc'
    const sp = new URLSearchParams()

    if (q) sp.set('q', q)
    if (status) sp.set('status', status)
    if (category) sp.set('category', category)
    sp.set('sort', columnKey)
    sp.set('dir', nextDir)

    return `/admin/applications?${sp.toString()}`
  }

  // Helper to generate quick status filter URLs
  const getStatusFilterUrl = (targetStatus: string) => {
    const sp = new URLSearchParams()

    if (q) sp.set('q', q)
    if (category) sp.set('category', category)
    if (sort) sp.set('sort', sort)
    if (dir) sp.set('dir', dir)
    if (targetStatus) sp.set('status', targetStatus)

    return `/admin/applications?${sp.toString()}`
  }

  const buildPageUrl = (targetPage: number) => {
    const sp = new URLSearchParams()

    if (q) sp.set('q', q)
    if (status) sp.set('status', status)
    if (category) sp.set('category', category)
    if (sort) sp.set('sort', sort)
    if (dir) sp.set('dir', dir)
    if (pageSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(pageSize))
    if (targetPage > 1) sp.set('page', String(targetPage))

    const qs = sp.toString()

    return qs ? `/admin/applications?${qs}` : '/admin/applications'
  }

  const buildPageSizeUrl = (targetSize: number | 'all') => {
    const sp = new URLSearchParams()

    if (q) sp.set('q', q)
    if (status) sp.set('status', status)
    if (category) sp.set('category', category)
    if (sort) sp.set('sort', sort)
    if (dir) sp.set('dir', dir)
    if (targetSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(targetSize))

    const qs = sp.toString()

    return qs ? `/admin/applications?${qs}` : '/admin/applications'
  }

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-6'>
      {/* Top Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Applications Management</h1>
          <p className='text-sm text-muted-foreground'>
            Review, verify documents, and manage submitted booth/stall applications for International Geeta Jayanti Mahotsav 2026.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <ExportApplicationsButton totalFiltered={totalFiltered} totalAll={totalSubmitted} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        <KpiCard
          label='Total Applications'
          value={totalSubmitted}
          icon={FileTextIcon}
          accentColor='text-[#0c2847]'
          hint={statsScopeHint}
        />
        <KpiCard
          label='Pending Review'
          value={pendingCount}
          icon={ClockIcon}
          accentColor='text-amber-600'
          hint='Paid applications awaiting a review decision'
        />
        <KpiCard
          label='Approved for Draw'
          value={approvedCount}
          icon={ShieldCheckIcon}
          accentColor='text-emerald-600'
          hint='Scrutinized and eligible for Draw'
        />
        <KpiCard
          label='Allotted / Selected'
          value={selectedCount}
          icon={CheckCircle2Icon}
          accentColor='text-purple-600'
          hint='Booths/Stalls successfully allotted or drawn'
        />
        <KpiCard
          label='Waitlist'
          value={waitlistCount}
          icon={ListOrderedIcon}
          accentColor='text-amber-600'
          hint='Candidates retained in draw waitlist order'
        />
      </div>

      {/* Status tabs */}
      <nav aria-label='Filter by status' className='-mb-2 overflow-x-auto overflow-y-hidden'>
        <ul className='flex min-w-max gap-6 border-b'>
          {[{ key: '', label: 'All', statuses: [] as string[] }, ...QUICK_FILTERS].map(filter => {
            const active = (status ?? '') === filter.key || (!tab && filter.key === '')

            const count = filter.key === 'waitlist'
              ? waitlistCount
              : filter.key
              ? statsRows.filter(r => filter.statuses.includes(r.status)).reduce((acc, r) => acc + Number(r.count), 0)
              : totalSubmitted

            return (
              <li key={filter.key || 'all'}>
                <Link
                  href={getStatusFilterUrl(filter.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? 'border-[#0c2847] text-[#0c2847]'
                      : 'border-transparent text-muted-foreground hover:border-slate-300 hover:text-slate-800'
                  }`}
                >
                  {filter.label}
                  <span className={`text-xs tabular-nums ${active ? 'text-[#0c2847]' : 'text-muted-foreground'}`}>
                    {count}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Filters & Search Bar */}
      <Card className='min-w-0 max-w-full overflow-hidden shadow-xs'>
        <CardContent className='pt-6'>
          <ApplicationsFilterBar categories={categories} />
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Applications List</CardTitle>
              <CardDescription className='text-xs'>
                {totalFiltered} result{totalFiltered === 1 ? '' : 's'} • Sorted by{' '}
                <span className='font-semibold text-[#0c2847]'>
                  {sort === 'date'
                    ? 'Submission Date'
                    : sort === 'app_no'
                      ? 'Application Number'
                      : sort === 'name'
                        ? 'Applicant Name'
                        : sort === 'category'
                          ? 'Category'
                          : 'Status'}
                </span>{' '}
                ({dir.toUpperCase()})
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          <ApplicationsTableClient
            applications={applications.map(app => {
              const statusCfg = STATUS_CONFIG[app.status] ?? {
                label: app.status,
                color: 'bg-gray-100 text-gray-700'
              }

              const encodedId = encodeId(app.id)
              const canApprove =
                (app.status === 'under_review' || app.status === 'payment_success' || app.status === 'rejected') &&
                !!permissions?.has('application:approve')
              const canReject =
                (app.status === 'under_review' ||
                  app.status === 'payment_success' ||
                  app.status === 'query_raised' ||
                  app.status === 'approved') &&
                !!permissions?.has('application:reject')

              // Matches queryApplicationAction's own eligibility check
              // (src/app/server/document-actions.ts) — kept in sync so the
              // menu item is never shown enabled only to be rejected server-side.
              const canRaiseQuery =
                (app.status === 'under_review' || app.status === 'payment_success' || app.status === 'query_raised') &&
                !!permissions?.has('document:verify')

              // Eligible for the bulk reminder exactly like the single-row
              // button on the application detail page: registration fee not
              // yet paid (covers payment_pending/payment_failed/draft-paid-
              // state applications), OR a stall was allotted/direct-allotted
              // and that allotment payment isn't paid yet either.
              const registrationPending =
                app.registration_payment_status !== 'success' &&
                app.registration_payment_status !== 'paid' &&
                app.registration_payment_status !== 'exempt'
              const allotmentPending =
                Boolean(app.is_direct_allotment) &&
                app.allotment_payment_status !== 'success' &&
                app.allotment_payment_status !== 'paid'
              const isPaymentPending = (registrationPending || allotmentPending) && !!permissions?.has('payment:reminder')

              return {
                ...app,
                encodedId,
                canApprove,
                canReject,
                canRaiseQuery,
                statusCfg,
                isPaymentPending,
                documents: documentsByApplicationId.get(app.id) ?? []
              }
            })}
            sortLinks={{
              appNo: getSortUrl('app_no'),
              name: getSortUrl('name'),
              category: getSortUrl('category'),
              status: getSortUrl('status'),
              date: getSortUrl('date')
            }}
            sortIcons={{
              appNo: sort === 'app_no' ? (dir === 'asc' ? 'asc' : 'desc') : 'none',
              name: sort === 'name' ? (dir === 'asc' ? 'asc' : 'desc') : 'none',
              category: sort === 'category' ? (dir === 'asc' ? 'asc' : 'desc') : 'none',
              status: sort === 'status' ? (dir === 'asc' ? 'asc' : 'desc') : 'none',
              date: sort === 'date' ? (dir === 'asc' ? 'asc' : 'desc') : 'none'
            }}
          />
        </CardContent>
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalFiltered}
          pageSize={pageSize}
          buildUrl={buildPageUrl}
          buildPageSizeUrl={buildPageSizeUrl}
        />
      </Card>
    </div>
  )
}

export default ApplicationsAdminPage
