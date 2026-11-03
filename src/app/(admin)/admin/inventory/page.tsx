import type { Metadata } from 'next'

import InventoryAdminPage from '@/views/admin/inventory/InventoryAdminPage'

export const metadata: Metadata = {
  title: 'Inventory — IGM Admin Portal'
}

// Admin data changes constantly (add/edit/delete/import), and this page's
// counts/table/breakdowns all come from one live DB read — a cached RSC
// payload from an earlier navigation would show stale counts or an empty
// table (reported live: counts showed 1 while the table showed "0 of 0",
// since the client was reusing Next's Router Cache instead of re-querying).
export const dynamic = 'force-dynamic'

export default InventoryAdminPage
