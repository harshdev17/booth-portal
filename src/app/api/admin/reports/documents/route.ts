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

/** Document verification export per .ai/REPORTS.md — permission-gated and audit-logged, see /api/admin/reports/applications for the same pattern. */
export async function GET() {
  try {
    const session = await requirePermission('report:export')

    const rows = await query<Array<Record<string, unknown>>>(
      `SELECT a.application_number, cdd.label AS document_type, ad.verification_status,
              ad.verification_remarks, verifier.full_name AS verified_by, ad.verified_at, ad.created_at
       FROM application_documents ad
       JOIN applications a ON a.id = ad.application_id
       JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
       LEFT JOIN users verifier ON verifier.id = ad.verified_by_user_id
       ORDER BY ad.created_at DESC`
    )

    const csv = toCsv(rows, [
      'application_number',
      'document_type',
      'verification_status',
      'verification_remarks',
      'verified_by',
      'verified_at',
      'created_at'
    ])

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'report.exported',
      module: 'reports',
      entityType: 'report',
      entityId: 'document_verification',
      newValue: { row_count: rows.length }
    })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="document-verification-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    })
  } catch (error) {
    logServerError('api.admin.reports.documents', error)

    return new Response('Failed to generate report.', { status: 500 })
  }
}
