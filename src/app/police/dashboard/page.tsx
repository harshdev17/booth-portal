import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ShieldCheckIcon,
  SearchIcon,
  StoreIcon,
  UserCheckIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  EyeIcon,
  PhoneIcon,
  MapPinIcon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { encodeId } from '@/lib/security/opaque-id'
import PoliceFilterBar from '@/views/police/PoliceFilterBar'
import TablePagination from '@/components/shared/TablePagination'
import { parsePageSize, resolveLimit } from '@/lib/pagination'

export const metadata: Metadata = {
  title: 'Police & Security Allotment Verification Portal — IGM 2026'
}

type PoliceAllottedItem = {
  id: number
  application_number: string
  representative_name: string
  organisation_name: string
  father_name: string
  mobile_number: string
  state: string
  district: string
  aadhaar_last4: string
  status: string
  category_name: string
  category_slug: string
  stall_number: string | null
  shop_type: string | null
  direction: string | null
  submitted_at: string | null
  doc_count: number
}

const DEFAULT_PAGE_SIZE = 25

export default async function PoliceDashboardPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string
    category?: string
    page?: string
    pageSize?: string
  }>
}) {
  await requirePermission('police:view')

  const { q, category, page: pageParam, pageSize: pageSizeParam } = await searchParams

  const pageSize = parsePageSize(pageSizeParam, DEFAULT_PAGE_SIZE)
  const page = pageSize === 'all' ? 1 : Math.max(1, Number(pageParam) || 1)
  const limit = resolveLimit(pageSize)
  const offset = pageSize === 'all' ? 0 : (page - 1) * pageSize

  const conditions: string[] = ["a.status IN ('selected', 'allotted', 're_allotted')"]
  const params: unknown[] = []

  if (category) {
    conditions.push('c.slug = ?')
    params.push(category)
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    conditions.push(
      '(a.application_number LIKE ? OR a.representative_name LIKE ? OR a.organisation_name LIKE ? OR a.mobile_number LIKE ? OR su.stall_number LIKE ?)'
    )
    params.push(term, term, term, term, term)
  }

  const whereClause = conditions.join(' AND ')

  // Fetch summary counts, categories, and rows
  const [totalRows, categoryList, totalAllottedCount, totalUnitsCount] = await Promise.all([
    query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       WHERE ${whereClause}`,
      params
    ),
    query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories WHERE status != 'archived' ORDER BY display_order ASC`
    ),
    query<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM applications WHERE status IN ('selected', 'allotted', 're_allotted')`
    ),
    query<Array<{ count: number }>>(`SELECT COUNT(*) AS count FROM shop_units WHERE status = 'allotted'`)
  ])

  const total = totalRows[0]?.count ?? 0

  const queryParams = [...params]
  let limitClause = ''
  if (limit !== null) {
    limitClause = 'LIMIT ? OFFSET ?'
    queryParams.push(limit, offset)
  }

  const allottedApps = await query<PoliceAllottedItem[]>(
    `SELECT a.id, a.application_number, a.representative_name, a.organisation_name,
            a.father_name, a.mobile_number, a.state, a.district, a.aadhaar_last4,
            a.status, a.submitted_at,
            c.name AS category_name, c.slug AS category_slug,
            su.stall_number, su.shop_type, su.direction,
            (SELECT COUNT(*) FROM application_documents ad WHERE ad.application_id = a.id) AS doc_count
     FROM applications a
     JOIN categories c ON c.id = a.category_id
     LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
     WHERE ${whereClause}
     ORDER BY su.stall_number IS NULL, su.stall_number ASC, a.id DESC
     ${limitClause}`,
    queryParams
  )

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize))

  const buildPageUrl = (targetPage: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (category) sp.set('category', category)
    if (pageSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(pageSize))
    if (targetPage > 1) sp.set('page', String(targetPage))
    const qs = sp.toString()
    return qs ? `/police/dashboard?${qs}` : '/police/dashboard'
  }

  const buildPageSizeUrl = (targetSize: number | 'all') => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (category) sp.set('category', category)
    if (targetSize !== DEFAULT_PAGE_SIZE) sp.set('pageSize', String(targetSize))
    const qs = sp.toString()
    return qs ? `/police/dashboard?${qs}` : '/police/dashboard'
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Top Banner / Police Identity */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-[#0c1a2e] text-white p-6 rounded-2xl border border-slate-800 shadow-sm'>
        <div>
          <div className='flex items-center gap-2 mb-1.5'>
            <Badge className='bg-blue-600 hover:bg-blue-600 text-white font-semibold text-xs px-2.5 py-0.5'>
              POLICE & SECURITY VERIFICATION UNIT
            </Badge>
            <span className='text-xs text-slate-400'>Live Allotment Database</span>
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-white'>
            Allotted Applications & Booth Verification
          </h1>
          <p className='text-sm text-slate-300 mt-1'>
            Official on-ground directory of all vendors, organizations, and allotted commercial spaces for IGM 2026.
          </p>
        </div>

        <div className='flex items-center gap-3'>
          <div className='bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center'>
            <span className='text-xs text-slate-400 block font-medium'>Approved Vendors</span>
            <span className='text-xl font-bold text-white'>{totalAllottedCount[0]?.count ?? 0}</span>
          </div>
          <div className='bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-center'>
            <span className='text-xs text-slate-400 block font-medium'>Allotted Booths/Stalls</span>
            <span className='text-xl font-bold text-blue-400'>{totalUnitsCount[0]?.count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <PoliceFilterBar categories={categoryList} />

      {/* Main Allotted Applications Table */}
      <Card className='shadow-xs border-slate-200'>
        <CardHeader className='border-b bg-slate-50/60 py-4 px-6 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-base font-bold text-slate-900'>
              Verified & Allotted Candidates ({total})
            </CardTitle>
            <CardDescription className='text-xs text-slate-500'>
              Click &quot;View Full Profile&quot; on any record to inspect complete identity details, address, and uploaded ID documents.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='p-0 overflow-x-auto'>
          {allottedApps.length === 0 ? (
            <div className='py-16 text-center text-slate-500'>
              <ShieldCheckIcon className='size-12 mx-auto text-slate-300 mb-3' />
              <p className='text-base font-semibold text-slate-700'>No allotted applications found.</p>
              <p className='text-xs text-slate-400 mt-1 max-w-sm mx-auto'>
                Try adjusting your search terms or filter to see approved candidates.
              </p>
            </div>
          ) : (
            <table className='w-full text-left text-sm'>
              <thead className='border-b bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider'>
                <tr>
                  <th className='py-3.5 px-4'>Booth/Stall</th>
                  <th className='py-3.5 px-4'>App Number</th>
                  <th className='py-3.5 px-4'>Allottee / Representative</th>
                  <th className='py-3.5 px-4'>Category</th>
                  <th className='py-3.5 px-4'>Location / Origin</th>
                  <th className='py-3.5 px-4'>Contact No.</th>
                  <th className='py-3.5 px-4'>Status</th>
                  <th className='py-3.5 px-4 text-right'>Action</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200'>
                {allottedApps.map(item => {
                  const encodedId = encodeId(item.id)

                  return (
                    <tr key={item.id} className='hover:bg-blue-50/40 transition group'>
                      {/* Stall Number */}
                      <td className='py-3.5 px-4 font-mono font-bold text-sm text-slate-900'>
                        {item.stall_number ? (
                          <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-200 text-xs'>
                            <StoreIcon className='size-3.5 text-blue-700' />
                            <span>Stall #{item.stall_number}</span>
                          </div>
                        ) : (
                          <span className='text-xs font-normal text-slate-400 italic'>Unassigned Unit</span>
                        )}
                        {item.direction && (
                          <span className='block text-[10px] text-slate-500 font-sans mt-0.5'>
                            Facing: {item.direction}
                          </span>
                        )}
                      </td>

                      {/* Application Number */}
                      <td className='py-3.5 px-4 font-mono text-xs font-semibold text-blue-950'>
                        {item.application_number}
                      </td>

                      {/* Allottee & Organisation */}
                      <td className='py-3.5 px-4'>
                        <div className='font-bold text-slate-900 text-sm flex items-center gap-1.5'>
                          {item.representative_name}
                        </div>
                        {item.organisation_name && item.organisation_name !== '—' && (
                          <p className='text-xs text-slate-500 mt-0.5'>{item.organisation_name}</p>
                        )}
                        <p className='text-[11px] text-slate-400 mt-0.5'>S/O, D/O: {item.father_name}</p>
                      </td>

                      {/* Category */}
                      <td className='py-3.5 px-4'>
                        <span className='text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded'>
                          {item.category_name}
                        </span>
                      </td>

                      {/* Location */}
                      <td className='py-3.5 px-4 text-xs text-slate-600'>
                        <div className='flex items-center gap-1'>
                          <MapPinIcon className='size-3 text-slate-400 shrink-0' />
                          <span>
                            {item.district}, {item.state}
                          </span>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className='py-3.5 px-4 font-mono text-xs text-slate-800'>
                        <div className='flex items-center gap-1'>
                          <PhoneIcon className='size-3 text-slate-400' />
                          <span>+91 {item.mobile_number}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className='py-3.5 px-4'>
                        <span className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800'>
                          <CheckCircle2Icon className='size-3 text-emerald-600' />
                          {item.status === 'allotted' ? 'Allotted' : 'Selected'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className='py-3.5 px-4 text-right'>
                        <Link href={`/police/applications/${encodedId}`}>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 text-xs font-semibold text-blue-900 border-blue-200 bg-white hover:bg-blue-50 hover:text-blue-950 flex items-center gap-1.5'
                          >
                            <EyeIcon className='size-3.5' /> Full Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        buildUrl={buildPageUrl}
        buildPageSizeUrl={buildPageSizeUrl}
      />
    </div>
  )
}
