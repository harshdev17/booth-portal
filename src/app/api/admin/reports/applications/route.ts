import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

function toCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(',')
  const lines = rows.map(row => columns.map(col => toCsvField(row[col])).join(','))

  return [header, ...lines].join('\r\n')
}

/**
 * Applications export per .ai/REPORTS.md — permission-gated (report:export)
 * and audit-logged on every export (CLAUDE.md §12, .ai/AUDIT_LOGS.md
 * "data exports" is a mandatory-log item). No Aadhaar/payment identifiers
 * are included — masked-only fields, matching the admin detail view.
 */
export async function GET() {
  try {
    const session = await requirePermission('report:export')

    const rows = await query<Array<Record<string, unknown>>>(
      `SELECT a.application_number, c.name AS category, a.representative_name, a.organisation_name,
              a.mobile_number, a.email, a.district, a.state, a.status, a.submitted_at, a.created_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.status != 'draft'
       ORDER BY a.created_at DESC`
    )

    const csv = toCsv(rows, [
      'application_number',
      'category',
      'representative_name',
      'organisation_name',
      'mobile_number',
      'email',
      'district',
      'state',
      'status',
      'submitted_at',
      'created_at'
    ])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'report.exported',
      module: 'reports',
      entityType: 'report',
      entityId: 'applications',
      newValue: { row_count: rows.length }
    })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    })
  } catch (error) {
    logServerError('api.admin.reports.applications', error)

    return new Response('Failed to generate report.', { status: 500 })
  }
}
