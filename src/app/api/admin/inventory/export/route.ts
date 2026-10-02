import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { buildExportCsv, type ShopUnitExportRow } from '@/lib/inventory/shop-units-csv'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/**
 * Exports the current shop inventory as CSV. Permission-gated and
 * audit-logged on every export, matching the applications report export
 * pattern (CLAUDE.md §12, .ai/AUDIT_LOGS.md "data exports").
 */
export async function GET() {
  try {
    const session = await requirePermission('inventory:view')

    const rows = await query<ShopUnitExportRow[]>(
      `SELECT su.stall_number, su.shop_type, c.name AS category_name, su.direction, su.emd_amount_paise
       FROM shop_units su
       JOIN categories c ON c.id = su.category_id
       ORDER BY su.stall_number ASC`
    )

    const csv = buildExportCsv(rows)

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.exported',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: 'all',
      newValue: { row_count: rows.length }
    })

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shop-inventory-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    })
  } catch (error) {
    logServerError('api.admin.inventory.export', error)

    return new Response('Failed to generate export.', { status: 500 })
  }
}
