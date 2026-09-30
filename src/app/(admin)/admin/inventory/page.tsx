import type { Metadata } from 'next'

import { StoreIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Inventory — IGM Admin Portal'
}

const InventoryAdminPage = async () => {
  await requirePermission('inventory:view')

  return (
    <ModulePending
      title='Inventory / Shops'
      icon={<StoreIcon className='size-6' />}
      description='Manage the physical shop/stall units per category and their state (available / reserved / allotted / cancelled).'
    />
  )
}

export default InventoryAdminPage
