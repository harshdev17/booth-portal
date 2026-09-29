import type { Metadata } from 'next'

import Link from 'next/link'

import { SearchIcon, UsersIcon } from 'lucide-react'

import TablePagination from '@/components/shared/TablePagination'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getApplicationStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Applicant / User Details — KDB Admin Portal'
}

const DEFAULT_PAGE_SIZE = 25

const VALID_SORT_FIELDS: Record<string, string> = {
  name: 'representative_name',
  mobile: 'mobile_number',
  applications: 'application_count',
  activity: 'last_activity'
}

type ApplicantRow = {
  mobile_number: string
  representative_name: string
  email: string
  organisation_name: string
  application_count: number
  application_ids: string
  statuses: string
  last_activity: string
}

/**
 * Applicant/User Details per .ai/ADMIN_PANEL.md Section 5 — grouped by
 * mobile number, since applications don't yet carry a separate applicant/user
 * account entity (whether one applicant may hold multiple applications is
 * [TBC – Business Confirmation Required], see .ai/BUSINESS_RULES.md #13).
 * Each row links into the existing Application detail page's tabs, which
 * already cover Personal / Application / Documents / Selection / Audit.
 */
const ApplicantsAdminPage = async ({
  searchParams
}: {
  searchParams: Promise<{ q?: string; sort?: string; dir?: 'asc' | 'desc'; page?: string; pageSize?: string }>
}) => {
  await requirePermission('application:view')

  const { q, sort = 'activity', dir = 'desc', page: pageParam, pageSize: pageSizeParam } = await searchParams
  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE)
  const page = pageSize === 'all' ? 1 : Math.max(1, Number(pageParam) || 1)
  const limit = resolveLimit(pageSize)
  const offset = pageSize === 'all' ? 0 : (page - 1) * pageSize

  const conditions = [`a.status != 'draft'`]
  const params: unknown[] = []

  if (q && q.trim()) {
    conditions.push(`(a.representative_name LIKE ? OR a.mobile_number LIKE ? OR a.email LIKE ? OR a.organisation_name LIKE ?)`)
    const pattern = `%${q.trim()}%`

    params.push(pattern, pattern, pattern, pattern)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const sortCol = VALID_SORT_FIELDS[sort] ?? 'last_activity'
  const sortDir = dir.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const [applicants, countRows] = await Promise.all([
    query<ApplicantRow[]>(
      `SELECT mobile_number, representative_name, email, organisation_name, application_count,
              application_ids, statuses, last_activity
       FROM (
         SELECT a.mobile_number,
                MAX(a.representative_name) AS representative_name,
                MAX(a.email) AS email,
                MAX(a.organisation_name) AS organisation_name,
                COUNT(*) AS application_count,
                GROUP_CONCAT(a.id ORDER BY a.created_at DESC) AS application_ids,
                GROUP_CONCAT(a.status ORDER BY a.created_at DESC) AS statuses,
                MAX(a.created_at) AS last_activity
         FROM applications a
         ${whereClause}
         GROUP BY a.mobile_number
       ) grouped
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(DISTINCT a.mobile_number) AS total FROM applications a ${whereClause}`,
      params
    )
  ])

  const total = countRows[0]?.total ?? 0
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize))

  const buildUrl = (overrides: { sort?: string; dir?: string; page?: number; pageSize?: number | 'all' }) => {
    const sp = new URLSearchParams()
    const merged = { sort, dir, page, pageSize, ...overrides }

    if (q) sp.set('q', q)
    if (merged.sort) sp.set('sort', merged.sort)
    if (merged.dir) sp.set('dir', merged.dir)
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(merged.pageSize))
    if (merged.page && merged.page > 1) sp.set('page', String(merged.page))

    const qs = sp.toString()

    return qs ? `/admin/applicants?${qs}` : '/admin/applicants'
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

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Applicant / User Details</h1>
        <p className='text-sm text-muted-foreground'>
          Applicants grouped by mobile number, with links into their application record(s).
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardContent className='pt-6'>
          <form method='GET' className='relative'>
            <input type='hidden' name='sort' value={sort} />
            <input type='hidden' name='dir' value={dir} />
            <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input name='q' defaultValue={q} placeholder='Search by name, mobile, email or firm...' className='pl-9' />
          </form>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Applicants</CardTitle>
          <CardDescription className='text-xs'>{total} applicant(s)</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {applicants.length === 0 ? (
            <div className='py-12 text-center'>
              <UsersIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No applicants found.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
                  <tr>
                    <th className='py-3 px-4'>
                      <Link href={getSortUrl('name')} className='inline-flex items-center hover:text-[#0c2847] transition'>
                        Applicant
                        {getSortIcon('name')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>
                      <Link href={getSortUrl('mobile')} className='inline-flex items-center hover:text-[#0c2847] transition'>
                        Contact
                        {getSortIcon('mobile')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>Firm / Organisation</th>
                    <th className='py-3 px-4'>
                      <Link
                        href={getSortUrl('applications')}
                        className='inline-flex items-center hover:text-[#0c2847] transition'
                      >
                        Application(s)
                        {getSortIcon('applications')}
                      </Link>
                    </th>
                    <th className='py-3 px-4'>
                      <Link href={getSortUrl('activity')} className='inline-flex items-center hover:text-[#0c2847] transition'>
                        Last Activity
                        {getSortIcon('activity')}
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {applicants.map(applicant => {
                    const ids = applicant.application_ids.split(',')
                    const statuses = applicant.statuses.split(',')

                    return (
                      <tr key={applicant.mobile_number} className='hover:bg-muted/30 transition'>
                        <td className='py-3.5 px-4 font-bold text-[#0c2847]'>{applicant.representative_name}</td>
                        <td className='py-3.5 px-4 text-xs space-y-0.5'>
                          <p className='font-mono font-medium text-slate-800'>{applicant.mobile_number}</p>
                          <p className='text-muted-foreground truncate max-w-[180px]'>{applicant.email}</p>
                        </td>
                        <td className='py-3.5 px-4'>{applicant.organisation_name}</td>
                        <td className='py-3.5 px-4'>
                          <div className='flex flex-wrap gap-1.5'>
                            {ids.map((appId, idx) => {
                              const statusCfg = getApplicationStatusConfig(statuses[idx])

                              return (
                                <Link
                                  key={appId}
                                  href={`/admin/applications/${appId}`}
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold hover:opacity-80 transition ${statusCfg.color}`}
                                >
                                  {statusCfg.label}
                                </Link>
                              )
                            })}
                          </div>
                        </td>
                        <td className='py-3.5 px-4 text-xs text-muted-foreground'>
                          {new Date(applicant.last_activity).toLocaleDateString('en-IN')}
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
          totalItems={total}
          pageSize={pageSize}
          buildUrl={targetPage => buildUrl({ page: targetPage })}
          buildPageSizeUrl={targetSize => buildUrl({ pageSize: targetSize, page: 1 })}
        />
      </Card>
    </div>
  )
}

export default ApplicantsAdminPage
