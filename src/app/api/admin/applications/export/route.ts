import { type NextRequest } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { toCsvField } from '@/lib/export/csv'
import { requireAnyPermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const QUICK_FILTERS: Record<string, string[]> = {
  under_review: ['under_review', 'payment_success'],
  query_raised: ['query_raised'],
  selected: ['selected', 'allotted', 're_allotted'],
  rejected: ['rejected', 'not_selected', 'cancelled']
}

const CSV_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'application_number', label: 'Application Number' },
  { key: 'category_name', label: 'Category' },
  { key: 'selection_method', label: 'Selection Method' },
  { key: 'representative_name', label: 'Applicant / Representative Name' },
  { key: 'father_name', label: 'Father / Husband Name' },
  { key: 'police_station_name', label: 'Police Station Name' },
  { key: 'police_station_address', label: 'Police Station Address' },
  { key: 'organisation_name', label: 'Organisation / Business Name' },
  { key: 'mobile_number', label: 'WhatsApp Number' },
  { key: 'alternate_mobile', label: 'Alternate Mobile' },
  { key: 'email', label: 'Email Address' },
  { key: 'aadhaar_last4', label: 'Aadhaar (Last 4)' },
  { key: 'address', label: 'Address' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'pin_code', label: 'PIN Code' },
  { key: 'work_purpose', label: 'Work / Craft Description' },
  { key: 'achievement_experience', label: 'Experience / Achievements' },
  { key: 'remarks', label: 'Remarks / Notes' },
  { key: 'status', label: 'Application Status' },
  { key: 'stall_number', label: 'Allotted Booth/Stall Number' },
  { key: 'shop_type', label: 'Booth/Stall Type' },
  { key: 'stall_direction', label: 'Booth/Stall Location / Facing' },
  { key: 'draw_allocation_type', label: 'Draw / Allotment Type' },
  { key: 'waitlist_position', label: 'Waitlist Position' },
  { key: 'amount_paid_inr', label: 'Fee Paid (INR)' },
  { key: 'payment_status', label: 'Payment Status' },
  { key: 'payment_order_id', label: 'Payment Order ID' },
  { key: 'total_docs', label: 'Total Documents Uploaded' },
  { key: 'verified_docs', label: 'Verified Documents' },
  { key: 'open_queries', label: 'Open Queries' },
  { key: 'submitted_at', label: 'Submission Timestamp' },
  { key: 'created_at', label: 'Registration Timestamp' }
]

export async function GET(request: NextRequest) {
  try {
    const session = await requireAnyPermission(['application:view', 'report:export'])

    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')?.trim()
    const statusParam = searchParams.get('status')?.trim()
    const categoryParam = searchParams.get('category')?.trim()
    const isAll = searchParams.get('all') === 'true'

    const conditions: string[] = []
    const params: unknown[] = []

    if (!isAll) {
      if (statusParam && QUICK_FILTERS[statusParam]) {
        const statuses = QUICK_FILTERS[statusParam]
        conditions.push(`a.status IN (${statuses.map(() => '?').join(', ')})`)
        params.push(...statuses)
      } else if (!statusParam) {
        // Exclude raw unsubmitted drafts by default unless 'all=true'
        conditions.push(`a.status NOT IN ('draft', 'payment_pending', 'payment_failed')`)
      }

      if (categoryParam && categoryParam !== 'all') {
        conditions.push(`c.slug = ?`)
        params.push(categoryParam)
      }

      if (q) {
        conditions.push(
          `(a.application_number LIKE ? OR a.representative_name LIKE ? OR a.organisation_name LIKE ? OR a.mobile_number LIKE ? OR a.email LIKE ?)`
        )
        const pattern = `%${q}%`
        params.push(pattern, pattern, pattern, pattern, pattern)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await query<Array<Record<string, unknown>>>(
      `SELECT 
        a.application_number,
        c.name AS category_name,
        c.selection_method,
        a.representative_name,
        a.father_name,
        a.police_station_name,
        a.police_station_address,
        a.organisation_name,
        a.mobile_number,
        a.alternate_mobile,
        a.email,
        a.aadhaar_last4,
        a.address,
        a.district,
        a.state,
        a.pin_code,
        a.work_purpose,
        a.achievement_experience,
        a.remarks,
        a.status,
        COALESCE(su.stall_number, da_su.stall_number, '') AS stall_number,
        COALESCE(su.shop_type, da_su.shop_type, '') AS shop_type,
        COALESCE(su.direction, da_su.direction, '') AS stall_direction,
        COALESCE(da.allocation_type, '') AS draw_allocation_type,
        da.waitlist_position,
        ROUND(COALESCE(p.amount_paise, 0) / 100, 2) AS amount_paid_inr,
        COALESCE(p.status, 'unpaid') AS payment_status,
        COALESCE(p.razorpay_order_id, '') AS payment_order_id,
        (SELECT COUNT(*) FROM application_documents ad WHERE ad.application_id = a.id) AS total_docs,
        (SELECT COUNT(*) FROM application_documents ad WHERE ad.application_id = a.id AND ad.verification_status = 'verified') AS verified_docs,
        (SELECT COUNT(*) FROM application_documents ad WHERE ad.application_id = a.id AND ad.verification_status = 'query') AS open_queries,
        DATE_FORMAT(a.submitted_at, '%Y-%m-%d %H:%i:%s') AS submitted_at,
        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
      FROM applications a
      JOIN categories c ON c.id = a.category_id
      LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
      LEFT JOIN draw_allocations da ON da.application_id = a.id
      LEFT JOIN shop_units da_su ON da_su.id = da.shop_unit_id
      LEFT JOIN payments p ON p.id = (
        SELECT id FROM payments p2 WHERE p2.application_id = a.id ORDER BY p2.id DESC LIMIT 1
      )
      ${whereClause}
      ORDER BY a.created_at DESC`,
      params
    )

    // Build CSV with BOM for UTF-8 Excel support
    const headerLine = CSV_COLUMNS.map(col => toCsvField(col.label)).join(',')
    const dataLines = rows.map(row => CSV_COLUMNS.map(col => toCsvField(row[col.key])).join(','))
    const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n')

    // Audit logging
    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application.exported',
      module: 'applications',
      entityType: 'application',
      entityId: isAll ? 'all' : (statusParam || 'filtered'),
      newValue: {
        row_count: rows.length,
        filters: { q: q || null, status: statusParam || null, category: categoryParam || null, isAll }
      }
    })

    const dateStamp = new Date().toISOString().slice(0, 10)
    const filenamePrefix = isAll
      ? 'applications-all'
      : statusParam
      ? `applications-${statusParam}`
      : categoryParam
      ? `applications-${categoryParam}`
      : 'applications-data'

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenamePrefix}-${dateStamp}.csv"`
      }
    })
  } catch (error) {
    logServerError('api.admin.applications.export', error)

    return new Response('Failed to generate export.', { status: 500 })
  }
}
