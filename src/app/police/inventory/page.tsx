import type { Metadata } from 'next'

import InventoryAdminPage from '@/views/admin/inventory/InventoryAdminPage'

export const metadata: Metadata = {
  title: 'Inventory — IGM Police Portal'
}

// Same reasoning as (admin)/admin/inventory/page.tsx — live counts/table
// from one DB read, never cached across navigations.
export const dynamic = 'force-dynamic'

/**
 * URL-only alias for /admin/inventory, added 2026-11-03 so the police
 * portal's "Inventory / Booths/Stalls" nav link doesn't send a police_user
 * to a URL with "admin" in it. Identical page, identical
 * requirePermission('inventory:view') gate inside InventoryAdminPage — this
 * route adds no new authorization logic of its own, it's wrapped by
 * police/layout.tsx's own session check the same way every other /police
 * route is.
 */
export default InventoryAdminPage
