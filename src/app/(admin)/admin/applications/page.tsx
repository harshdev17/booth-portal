import type { Metadata } from 'next'

import Link from 'next/link'

import { CheckCircle2Icon, ClockIcon, FileTextIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import KpiCard from '@/components/shared/KpiCard'
import TablePagination from '@/components/shared/TablePagination'
import { query } from '@/lib/db/client'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { encodeId } from '@/lib/security/opaque-id'
import ApplicationRowActions from '@/views/admin/applications/ApplicationRowActions'
import ApplicationsFilterBar from '@/views/admin/applications/ApplicationsFilterBar'

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
  selected: { label: 'Selected / Allotted', variant: 'default', color: 'bg-purple-100 text-purple-800' },
  rejected: { label: 'Rejected', variant: 'destructive', color: 'bg-red-100 text-red-800' },
  allotted: { label: 'Allotted', variant: 'default', color: 'bg-emerald-100 text-emerald-800' }
}

// Quick-filter tabs: the `status` URL param maps to one or more stored statuses
// ('payment_success' is the legacy value for Under Review).
const QUICK_FILTERS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: 'under_review', label: 'Under Review', statuses: ['under_review', 'payment_success'] },
  { key: 'query_raised', label: 'Query Raised', statuses: ['query_raised'] },
  { key: 'selected', label: 'Approved / Allotted', statuses: ['selected', 'allotted', 're_allotted'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected', 'not_selected', 'cancelled'] }
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

  // Exclude raw draft applications that were abandoned without submission unless specifically queried
  // An application only counts once its payment is made: drafts and unpaid
  // (payment_pending / payment_failed) rows are never listed.
  const tab = QUICK_FILTERS.find(f => f.key === status)

  if (tab) {
    conditions.push(`a.status IN (${tab.statuses.map(() => '?').join(', ')})`)
    params.push(...tab.statuses)
  } else {
    conditions.push(`a.status NOT IN ('draft', 'payment_pending', 'payment_failed')`)
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

  // Validate sort parameters safely against whitelist
  const sortCol = VALID_SORT_FIELDS[sort] ?? 'a.created_at'
  const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const [applications, categories, statsRows, countRows] = await Promise.all([
    query<ApplicationItem[]>(
      `SELECT a.id, a.application_number, c.name AS category_name, c.slug AS category_slug,
              a.organisation_name, a.representative_name, a.mobile_number, a.email,
              a.status, c.fee_paise, a.submitted_at, a.created_at,
              (SELECT COUNT(*) FROM application_documents d
                WHERE d.application_id = a.id AND d.verification_status = 'query') AS open_queries,
              (SELECT COUNT(*) FROM application_documents d
                WHERE d.application_id = a.id AND d.reuploaded_at IS NOT NULL AND d.verification_status = 'pending') AS reuploaded_pending
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories WHERE status != 'archived' ORDER BY display_order ASC`
    ),
    query<Array<{ status: string; count: number }>>(
      `SELECT status, COUNT(*) AS count FROM applications WHERE status NOT IN ('draft', 'payment_pending', 'payment_failed') GROUP BY status`
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM applications a JOIN categories c ON c.id = a.category_id ${whereClause}`,
      params
    )
  ])

  const totalSubmitted = statsRows.reduce((acc, row) => acc + Number(row.count), 0)
  const pendingCount = statsRows.find(r => r.status === 'under_review' || r.status === 'payment_success')?.count ?? 0
  const selectedCount = statsRows.find(r => r.status === 'selected' || r.status === 'allotted')?.count ?? 0
  const totalFiltered = countRows[0]?.total ?? 0
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize))

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

  const getSortIcon = (columnKey: string) => {
    if (sort !== columnKey) {
      return <span className='ml-1 opacity-30 select-none text-[11px]'>↕</span>
    }

    return dir === 'asc' ? (
      <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↑</span>
    ) : (
      <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↓</span>
    )
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
    <div className='flex flex-col gap-6'>
      {/* Top Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Applications Management</h1>
          <p className='text-sm text-muted-foreground'>
            Review, verify documents, and manage submitted stall applications for International Geeta Jayanti Mahotsav 2026.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <KpiCard
          label='Total Applications'
          value={totalSubmitted}
          icon={FileTextIcon}
          accentColor='text-[#0c2847]'
          hint='Submitted across all commercial stall categories'
        />
        <KpiCard
          label='Pending Review'
          value={pendingCount}
          icon={ClockIcon}
          accentColor='text-amber-600'
          hint='Paid applications awaiting a review decision'
        />
        <KpiCard
          label='Allotted / Selected'
          value={selectedCount}
          icon={CheckCircle2Icon}
          accentColor='text-purple-600'
          hint='Stalls successfully allotted or drawn'
        />
      </div>

      {/* Status tabs */}
      <nav aria-label='Filter by status' className='-mb-2 overflow-x-auto overflow-y-hidden'>
        <ul className='flex min-w-max gap-6 border-b'>
          {[{ key: '', label: 'All', statuses: [] as string[] }, ...QUICK_FILTERS].map(filter => {
            const active = (status ?? '') === filter.key || (!tab && filter.key === '')

            const count = filter.key
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
      <Card className='shadow-xs'>
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
          {applications.length === 0 ? (
            <div className='py-12 text-center'>
              <FileTextIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No applications found.</p>
              <p className='text-xs text-muted-foreground/80 mt-1'>
                Try adjusting your search criteria or filter options.
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
                  <tr>
                    <th className='py-3 px-4'>
                      <Link
                        href={getSortUrl('app_no')}
                        className='inline-flex items-center hover:text-[#0c2847] transition group'
                        title='Click to sort by Application Number'
                      >
                        App Number
                        {getSortIcon('app_no')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>
                      <Link
                        href={getSortUrl('name')}
                        className='inline-flex items-center hover:text-[#0c2847] transition group'
                        title='Click to sort by Applicant Name'
                      >
                        Applicant / Firm
                        {getSortIcon('name')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>
                      <Link
                        href={getSortUrl('category')}
                        className='inline-flex items-center hover:text-[#0c2847] transition group'
                        title='Click to sort by Category'
                      >
                        Category
                        {getSortIcon('category')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>Contact</th>
                    <th className='py-3 px-4'>
                      <Link
                        href={getSortUrl('status')}
                        className='inline-flex items-center hover:text-[#0c2847] transition group'
                        title='Click to sort by Status'
                      >
                        Status
                        {getSortIcon('status')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>
                      <Link
                        href={getSortUrl('date')}
                        className='inline-flex items-center hover:text-[#0c2847] transition group'
                        title='Click to sort by Date'
                      >
                        Submitted At
                        {getSortIcon('date')}
                      </Link>
                    </th>
                    <th className='py-3 px-4 text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {applications.map(app => {
                    const statusCfg = STATUS_CONFIG[app.status] ?? {
                      label: app.status,
                      color: 'bg-gray-100 text-gray-700'
                    }

                    const encodedId = encodeId(app.id)
                    const canApprove = (app.status === 'under_review' || app.status === 'payment_success') && !!permissions?.has('application:approve')

                    const canReject =
                      (app.status === 'under_review' || app.status === 'payment_success' || app.status === 'query_raised') &&
                      !!permissions?.has('application:reject')

                    return (
                      <tr key={app.id} className='hover:bg-muted/30 transition'>
                        <td className='py-3.5 px-4 font-mono font-bold text-[#0c2847]'>
                          <Link href={`/admin/applications/${encodedId}`} className='hover:underline'>
                            {app.application_number}
                          </Link>
                        </td>
                        <td className='py-3.5 px-4'>
                          <p className='font-bold text-[#0c2847]'>{app.representative_name}</p>
                          <p className='text-xs text-muted-foreground'>{app.organisation_name}</p>
                        </td>
                        <td className='py-3.5 px-4'>
                          <span className='inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800'>
                            {app.category_name}
                          </span>
                        </td>
                        <td className='py-3.5 px-4 text-xs space-y-0.5'>
                          <p className='font-mono font-medium text-slate-800'>{app.mobile_number}</p>
                          <p className='text-muted-foreground truncate max-w-[160px]'>{app.email}</p>
                        </td>
                        <td className='py-3.5 px-4'>
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                          {Number(app.open_queries) > 0 && (
                            <p className='mt-1 text-[11px] font-semibold text-orange-700'>
                              {app.open_queries} document {Number(app.open_queries) === 1 ? 'query' : 'queries'} open
                            </p>
                          )}
                          {Number(app.reuploaded_pending) > 0 && (
                            <p className='mt-1 text-[11px] font-semibold text-emerald-700'>
                              Re-uploaded · needs review
                            </p>
                          )}
                        </td>
                        <td className='py-3.5 px-4 text-xs text-muted-foreground'>
                          {app.submitted_at
                            ? new Date(app.submitted_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : new Date(app.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className='py-3.5 px-4'>
                          <div className='flex justify-end'>
                            <ApplicationRowActions applicationId={encodedId} canApprove={canApprove} canReject={canReject} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
