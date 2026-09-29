import type { Metadata } from 'next'

import Link from 'next/link'

import { EyeIcon, FileTextIcon, FilterIcon, SearchIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import TablePagination from '@/components/shared/TablePagination'
import { query } from '@/lib/db/client'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import { requirePermission } from '@/lib/rbac/authorize'

const DEFAULT_PAGE_SIZE = 25

export const metadata: Metadata = {
  title: 'Applications Management — KDB Admin Portal'
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
  payment_success: { label: 'Payment Success', variant: 'default', color: 'bg-emerald-100 text-emerald-800' },
  under_review: { label: 'Under Review', variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
  selected: { label: 'Selected / Allotted', variant: 'default', color: 'bg-purple-100 text-purple-800' },
  rejected: { label: 'Rejected', variant: 'destructive', color: 'bg-red-100 text-red-800' },
  allotted: { label: 'Allotted', variant: 'default', color: 'bg-emerald-100 text-emerald-800' }
}

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

  const { q, status, category, sort = 'date', dir = 'desc', page: pageParam, pageSize: pageSizeParam } =
    await searchParams

  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE)
  const page = pageSize === 'all' ? 1 : Math.max(1, Number(pageParam) || 1)
  const limit = resolveLimit(pageSize)
  const offset = pageSize === 'all' ? 0 : (page - 1) * pageSize

  const conditions: string[] = []
  const params: unknown[] = []

  // Exclude raw draft applications that were abandoned without submission unless specifically queried
  if (!status) {
    conditions.push(`a.status != 'draft'`)
  } else if (status !== 'all') {
    conditions.push(`a.status = ?`)
    params.push(status)
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
              a.status, c.fee_paise, a.submitted_at, a.created_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories ORDER BY display_order ASC`
    ),
    query<Array<{ status: string; count: number }>>(
      `SELECT status, COUNT(*) AS count FROM applications WHERE status != 'draft' GROUP BY status`
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM applications a JOIN categories c ON c.id = a.category_id ${whereClause}`,
      params
    )
  ])

  const totalSubmitted = statsRows.reduce((acc, row) => acc + Number(row.count), 0)
  const pendingCount = statsRows.find(r => r.status === 'payment_pending' || r.status === 'under_review')?.count ?? 0
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
            Review, verify documents, and manage submitted stall applications for International Gita Mahotsav 2026.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <Card className='border-l-4 border-l-[#0c2847] shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-bold uppercase'>Total Applications</CardDescription>
            <CardTitle className='text-3xl font-extrabold text-[#0c2847]'>{totalSubmitted}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-xs text-muted-foreground'>Submitted across all commercial stall categories</p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-amber-500 shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-bold uppercase'>Pending Verification / Payment</CardDescription>
            <CardTitle className='text-3xl font-extrabold text-amber-600'>{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-xs text-muted-foreground'>Applications awaiting fee payment or review</p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-purple-600 shadow-xs'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs font-bold uppercase'>Allotted / Selected</CardDescription>
            <CardTitle className='text-3xl font-extrabold text-purple-700'>{selectedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-xs text-muted-foreground'>Stalls successfully allotted or drawn</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1'>
          <FilterIcon className='size-3.5' /> Quick Filters:
        </span>
        <Link
          href={getStatusFilterUrl('')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            !status
              ? 'bg-[#0c2847] text-white'
              : 'border border-border bg-white text-muted-foreground hover:bg-muted'
          }`}
        >
          All Active ({totalSubmitted})
        </Link>
        <Link
          href={getStatusFilterUrl('payment_pending')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            status === 'payment_pending'
              ? 'bg-amber-600 text-white'
              : 'border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100'
          }`}
        >
          Payment Pending
        </Link>
        <Link
          href={getStatusFilterUrl('under_review')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            status === 'under_review'
              ? 'bg-blue-600 text-white'
              : 'border border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100'
          }`}
        >
          Under Review
        </Link>
        <Link
          href={getStatusFilterUrl('selected')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            status === 'selected'
              ? 'bg-purple-600 text-white'
              : 'border border-purple-200 bg-purple-50/70 text-purple-800 hover:bg-purple-100'
          }`}
        >
          Selected / Allotted ({selectedCount})
        </Link>
        <Link
          href={getStatusFilterUrl('rejected')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            status === 'rejected'
              ? 'bg-red-600 text-white'
              : 'border border-red-200 bg-red-50/70 text-red-800 hover:bg-red-100'
          }`}
        >
          Rejected
        </Link>
        <Link
          href={getStatusFilterUrl('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            status === 'all'
              ? 'bg-slate-700 text-white'
              : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Include Incomplete Drafts
        </Link>
      </div>

      {/* Filters & Search Bar */}
      <Card className='shadow-xs'>
        <CardContent className='pt-6'>
          <form method='GET' className='flex flex-col sm:flex-row gap-3'>
            <input type='hidden' name='sort' value={sort} />
            <input type='hidden' name='dir' value={dir} />

            <div className='relative flex-1'>
              <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
              <Input
                name='q'
                defaultValue={q}
                placeholder='Search by Application Number, Name, Firm, Mobile or Email...'
                className='pl-9'
              />
            </div>

            <select
              name='category'
              defaultValue={category ?? 'all'}
              className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background'
            >
              <option value='all'>All Categories</option>
              {categories.map(c => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              name='status'
              defaultValue={status ?? ''}
              className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background'
            >
              <option value=''>Submitted (All Active)</option>
              <option value='payment_pending'>Payment Pending</option>
              <option value='under_review'>Under Review</option>
              <option value='selected'>Selected / Allotted</option>
              <option value='rejected'>Rejected</option>
              <option value='all'>Include Incomplete Drafts</option>
            </select>

            <button
              type='submit'
              className='inline-flex items-center justify-center rounded-md bg-[#0c2847] px-4 py-2 text-sm font-semibold text-white hover:bg-[#071f3a] transition'
            >
              Filter
            </button>

            {(q || status || category) && (
              <Link
                href='/admin/applications'
                className='inline-flex items-center justify-center rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted transition'
              >
                Clear
              </Link>
            )}
          </form>
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

                    return (
                      <tr key={app.id} className='hover:bg-muted/30 transition'>
                        <td className='py-3.5 px-4 font-mono font-bold text-[#0c2847]'>
                          <Link href={`/admin/applications/${app.id}`} className='hover:underline'>
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
                        <td className='py-3.5 px-4 text-right'>
                          <Link
                            href={`/admin/applications/${app.id}`}
                            className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
                          >
                            <EyeIcon className='size-3.5' /> View
                          </Link>
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
