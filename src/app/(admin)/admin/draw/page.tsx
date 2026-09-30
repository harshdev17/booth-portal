import type { Metadata } from 'next'

import { ShuffleIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Draw Process — IGM Admin Portal'
}

const DrawProcessPage = async () => {
  await requirePermission('draw:view')

  return (
    <ModulePending
      title='Draw Process'
      icon={<ShuffleIcon className='size-6' />}
      description='Run an admin-triggered, auditable draw when a category is oversubscribed, with an immutable snapshot of the eligible pool.'
    />
  )
}

export default DrawProcessPage
