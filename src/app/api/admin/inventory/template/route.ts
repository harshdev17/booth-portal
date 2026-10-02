import { query } from '@/lib/db/client'
import { buildTemplateCsv } from '@/lib/inventory/shop-units-csv'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/**
 * Downloadable blank CSV template for the shop inventory bulk import. Lists
 * every real, currently-active category as its own example row, so the
 * exact expected spelling for the Category column is visible in the
 * template itself rather than discovered only after a failed validation.
 */
export async function GET() {
  try {
    await requirePermission('inventory:manage')

    const categories = await query<Array<{ name: string }>>(
      `SELECT name FROM categories WHERE status != 'archived' ORDER BY display_order ASC`
    )

    const csv = buildTemplateCsv(categories.map(c => c.name))

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="shop-inventory-template.csv"'
      }
    })
  } catch (error) {
    logServerError('api.admin.inventory.template', error)

    return new Response('Failed to generate template.', { status: 500 })
  }
}
