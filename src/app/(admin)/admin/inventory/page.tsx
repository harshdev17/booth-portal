import type { Metadata } from 'next'

import { StoreIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Inventory — KDB Admin Portal'
}

const InventoryAdminPage = async () => {
  await requirePermission('inventory:view')

  return (
    <ModulePending
      title='Inventory / Shops'
      icon={<StoreIcon className='size-6' />}
      description='Manage the physical shop/stall units per category and their state (available / reserved / allotted / cancelled).'
      phase='Phase 9 (Inventory / Draw / Allotment)'
      blockedBy={[
        'No individual shop-unit inventory table exists yet — `category_shop_options` only models fee tiers (e.g. "Single Shop" vs "Double Shop"), not physical unit numbers with allotment state.',
        'Final shop numbers/counts per category are [TBC – Business Confirmation Required] (.ai/BUSINESS_RULES.md, .ai/INVENTORY.md).',
        'The one-active-allotment-per-shop constraint must be enforced at the database level once this table exists (.ai/DATABASE.md, CLAUDE.md §13) — not built ahead of the schema.'
      ]}
    />
  )
}

export default InventoryAdminPage
