import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { parsePageSize, resolveLimit } from '@/lib/pagination'
import PoliceAllottedStallsView, { type PoliceAllottedItem } from '@/views/police/PoliceAllottedStallsView'

export const metadata: Metadata = {
  title: 'Police & Security Allotment Verification Portal — IGM 2026'
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

  // Show all stalls on which allotment has actually taken place (Commercial + Custom/Direct)
  const conditions: string[] = [
    'su.stall_number IS NOT NULL',
    "(su.status = 'allotted' OR su.allotted_to_application_id IS NOT NULL OR da.id IS NOT NULL)"
  ]
  const params: unknown[] = []

  if (category) {
    conditions.push('c.slug = ?')
    params.push(category)
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    conditions.push(
      '(COALESCE(a.application_number, da.application_number) LIKE ? OR COALESCE(a.representative_name, da.contact_person, da.allottee_name) LIKE ? OR COALESCE(a.organisation_name, da.allottee_name) LIKE ? OR COALESCE(a.mobile_number, da.mobile_number) LIKE ? OR a.police_station_name LIKE ? OR su.stall_number LIKE ?)'
    )
    params.push(term, term, term, term, term, term)
  }

  const whereClause = conditions.join(' AND ')

  // Fetch summary counts, categories, and rows
  const [totalRows, categoryList, totalUnitsCount] = await Promise.all([
    query<Array<{ count: number }>>(
      `SELECT COUNT(DISTINCT su.id) AS count
       FROM shop_units su
       JOIN categories c ON c.id = su.category_id
       LEFT JOIN applications a ON a.id = su.allotted_to_application_id
       LEFT JOIN direct_allotments da ON da.shop_unit_id = su.id AND da.status = 'active'
       WHERE ${whereClause}`,
      params
    ),
    query<Array<{ id: number; name: string; slug: string; is_direct_allotment: number }>>(
      `SELECT id, name, slug, is_direct_allotment FROM categories WHERE status != 'archived' ORDER BY is_direct_allotment ASC, display_order ASC`
    ),
    query<Array<{ count: number }>>(
      `SELECT COUNT(DISTINCT su.id) AS count
       FROM shop_units su
       LEFT JOIN direct_allotments da ON da.shop_unit_id = su.id AND da.status = 'active'
       WHERE su.status = 'allotted' OR su.allotted_to_application_id IS NOT NULL OR da.id IS NOT NULL`
    )
  ])

  const total = totalRows[0]?.count ?? 0
  const totalAllottedStalls = totalUnitsCount[0]?.count ?? 0

  const queryParams = [...params]
  let limitClause = ''
  if (limit !== null) {
    limitClause = 'LIMIT ? OFFSET ?'
    queryParams.push(limit, offset)
  }

  const allottedApps = await query<PoliceAllottedItem[]>(
    `SELECT 
        COALESCE(a.id, da.application_id, 0) AS id,
        COALESCE(a.application_number, da.application_number, CONCAT('STALL-', su.stall_number)) AS application_number,
        COALESCE(a.representative_name, da.contact_person, da.allottee_name, 'Allotted Vendor') AS representative_name,
        COALESCE(a.organisation_name, da.allottee_name, '—') AS organisation_name,
        COALESCE(a.father_name, da.father_name, '—') AS father_name,
        COALESCE(a.police_station_name, '—') AS police_station_name,
        a.police_station_address,
        COALESCE(a.address, da.address, '—') AS address,
        COALESCE(a.state, '—') AS state,
        COALESCE(a.district, '—') AS district,
        a.pin_code,
        COALESCE(a.mobile_number, da.mobile_number, '—') AS mobile_number,
        a.alternate_mobile,
        COALESCE(a.aadhaar_last4, RIGHT(da.aadhaar_number, 4), '—') AS aadhaar_last4,
        COALESCE(a.work_purpose, da.work_purpose) AS work_purpose,
        COALESCE(a.status, 'allotted') AS status,
        COALESCE(a.submitted_at, da.allotted_at, su.created_at) AS submitted_at,
        c.name AS category_name,
        c.slug AS category_slug,
        c.is_direct_allotment,
        su.stall_number,
        su.shop_type,
        su.direction,
        COALESCE((SELECT COUNT(*) FROM application_documents ad WHERE ad.application_id = a.id), 0) AS doc_count
     FROM shop_units su
     JOIN categories c ON c.id = su.category_id
     LEFT JOIN applications a ON a.id = su.allotted_to_application_id
     LEFT JOIN direct_allotments da ON da.shop_unit_id = su.id AND da.status = 'active'
     WHERE ${whereClause}
     ORDER BY su.stall_number ASC, su.id DESC
     ${limitClause}`,
    queryParams
  )

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
    <PoliceAllottedStallsView
      allottedApps={allottedApps}
      total={total}
      categoryList={categoryList}
      totalAllottedCount={totalAllottedStalls}
      totalUnitsCount={totalAllottedStalls}
      page={page}
      pageSize={pageSize}
      buildPageUrl={buildPageUrl}
      buildPageSizeUrl={buildPageSizeUrl}
      viewMode='police'
    />
  )
}
