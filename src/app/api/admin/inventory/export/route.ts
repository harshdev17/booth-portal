import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/**
 * Audit-only endpoint. The CSV itself is now built client-side in
 * InventoryTable.tsx from the admin's currently filtered rows (so the
 * export actually respects the active tab/search/category/status/type/
 * direction/fees-paid filters — the old server route always ran one
 * unfiltered query, per explicit report 2026-11-28). This route just
 * records the export in the audit log (CLAUDE.md §12 / .ai/AUDIT_LOGS.md
 * "data exports"), fired alongside the client-side download.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:view')
    const body = await request.json().catch(() => ({}))
    const rowCount = typeof body?.rowCount === 'number' ? body.rowCount : null
    const filters = body?.filters && typeof body.filters === 'object' ? body.filters : null

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.exported',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: 'filtered',
      newValue: { row_count: rowCount, filters }
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    logServerError('api.admin.inventory.export', error)

    return new Response('Failed to record export.', { status: 500 })
  }
}
