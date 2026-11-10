import { type NextRequest } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { getApplicationStatusConfig, getPaymentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { toCsvField } from '@/lib/export/csv'
import { requireAnyPermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

// Reads request.nextUrl.searchParams, so this route's output genuinely
// depends on the request — force-dynamic rules out the exact failure mode
// already found once in this codebase (see /status page, 2026-11-07): a
// route Next.js statically prerenders ships ONE cached response/nonce for
// every request, which can misbehave in production in ways dev never
// reproduces. Every other working CSV export route in this app has no
// request-dependent input at all, so this route was the only CSV export
// actually exposed to that risk.
export const dynamic = 'force-dynamic'

const QUICK_FILTERS: Record<string, string[]> = {
  under_review: ['under_review', 'payment_success'],
  query_raised: ['query_raised'],
  selected: ['selected', 'allotted', 're_allotted'],
  rejected: ['rejected', 'not_selected', 'cancelled']
}

const CSV_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'application_number', label: 'Application Number' },
  { key: 'category_name', label: 'Category' },
  { key: 'representative_name', label: 'Applicant / Representative Name' },
  { key: 'father_name', label: 'Father / Husband Name' },
  { key: 'organisation_name', label: 'Organisation / Business Name' },
  { key: 'mobile_number', label: 'WhatsApp Number' },
  { key: 'alternate_mobile', label: 'Alternate Mobile' },
  { key: 'email', label: 'Email Address' },
  { key: 'aadhaar_last4', label: 'Aadhaar (Last 4)' },
  { key: 'address', label: 'Address' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'pin_code', label: 'PIN Code' },
  { key: 'police_station_name', label: 'Police Station Name' },
  { key: 'police_station_address', label: 'Police Station Address' },
  { key: 'work_purpose', label: 'Work / Craft Description' },
  { key: 'achievement_experience', label: 'Experience / Achievements' },
  { key: 'remarks', label: 'Remarks / Notes' },
  { key: 'status', label: 'Application Status' },
  { key: 'stall_number', label: 'Allotted Booth/Stall Number' },
  { key: 'shop_type', label: 'Booth/Stall Type' },
  { key: 'stall_direction', label: 'Booth/Stall Location / Facing' },
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

    // Drafts are unsubmitted, incomplete applications (the applicant never
    // finished/paid) — never useful in an export regardless of filters, so
    // excluded unconditionally rather than only when !isAll.
    conditions.push(`a.status != 'draft'`)

    if (!isAll) {
      if (statusParam && QUICK_FILTERS[statusParam]) {
        const statuses = QUICK_FILTERS[statusParam]
        conditions.push(`a.status IN (${statuses.map(() => '?').join(', ')})`)
        params.push(...statuses)
      } else if (!statusParam) {
        // Exclude unpaid/incomplete applications by default unless 'all=true'
        // ('draft' is already excluded unconditionally above)
        conditions.push(`a.status NOT IN ('payment_pending', 'payment_failed')`)
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
        a.id,
        a.application_number,
        c.name AS category_name,
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

    // Category-specific fields (application_field_values) aren't columns on
    // `applications` \u2014 they vary per category (e.g. "NGO Registration
    // Number" for Social Organizations, "Type of Organization" for others).
    // Per explicit request, each DISTINCT field label gets its own CSV
    // column (not squeezed into one combined column) \u2014 built dynamically
    // after CSV_COLUMNS, in first-seen order across all exported rows, with
    // each application's row left blank for any column that field doesn't
    // apply to it (most applications will have blanks in most of these
    // columns, since each category only uses a subset).
    //
    // Some category-specific field labels mean the same thing as an
    // existing fixed column (e.g. a category's "Father's / Mother's Name"
    // dynamic field vs. the fixed "Father / Husband Name" column) \u2014 reported
    // live via screenshot as the same name showing up twice. A dynamic
    // field whose label case-insensitively matches a fixed CSV_COLUMNS
    // label is folded INTO that fixed column (only when the fixed column is
    // still blank for that application \u2014 never overwriting real applicant-
    // table data) instead of getting its own duplicate column.
    const fixedLabelToKey = new Map(CSV_COLUMNS.map(col => [col.label.toLowerCase(), col.key]))
    const rowById = new Map(rows.map(row => [row.id as number, row]))

    const appIds = rows.map(r => r.id as number)
    const dynamicValuesByAppId = new Map<number, Map<string, string>>()
    const dynamicColumnLabels: string[] = []
    const seenLabels = new Set<string>()

    if (appIds.length > 0) {
      const dynamicRows = await query<Array<{ application_id: number; label: string; value: string }>>(
        `SELECT afv.application_id, cfd.label, afv.value
         FROM application_field_values afv
         JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
         WHERE afv.application_id IN (${appIds.map(() => '?').join(', ')})
         ORDER BY cfd.display_order ASC, afv.application_id`,
        appIds
      )

      for (const r of dynamicRows) {
        const fixedKey = fixedLabelToKey.get(r.label.toLowerCase())

        if (fixedKey) {
          const row = rowById.get(r.application_id)

          if (row && !row[fixedKey]) {
            row[fixedKey] = r.value
          }

          continue
        }

        if (!seenLabels.has(r.label)) {
          seenLabels.add(r.label)
          dynamicColumnLabels.push(r.label)
        }

        const appValues = dynamicValuesByAppId.get(r.application_id) ?? new Map<string, string>()

        appValues.set(r.label, r.value)
        dynamicValuesByAppId.set(r.application_id, appValues)
      }
    }

    const dynamicColumns = dynamicColumnLabels.map(label => ({ key: `dyn:${label}`, label }))
    const allColumns = [...CSV_COLUMNS, ...dynamicColumns]

    // Build CSV with BOM for UTF-8 Excel support
    const headerLine = allColumns.map(col => toCsvField(col.label)).join(',')
    const dataLines = rows.map(row => {
      const appValues = dynamicValuesByAppId.get(row.id as number)
      const rowWithDynamic: Record<string, unknown> = {
        ...row,
        status: getApplicationStatusConfig(row.status as string).label,
        payment_status:
          row.payment_status === 'unpaid' ? 'Not Paid' : getPaymentStatusConfig(row.payment_status as string).label
      }

      if (appValues) {
        for (const [label, value] of appValues) {
          rowWithDynamic[`dyn:${label}`] = value
        }
      }

      return allColumns.map(col => toCsvField(rowWithDynamic[col.key])).join(',')
    })
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
