import type { Metadata } from 'next'

import { ShuffleIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Draw Process — KDB Admin Portal'
}

const DrawProcessPage = async () => {
  await requirePermission('draw:view')

  return (
    <ModulePending
      title='Draw Process'
      icon={<ShuffleIcon className='size-6' />}
      description='Run an admin-triggered, auditable draw when a category is oversubscribed, with an immutable snapshot of the eligible pool.'
      phase='Phase 9 (Inventory / Draw / Allotment)'
      blockedBy={[
        'The exact draw selection method/algorithm is explicitly not to be invented — [TBC – Business Confirmation Required] (.ai/BUSINESS_RULES.md #17, .ai/DRAW_PROCESS.md).',
        'Draw eligibility gates (e.g. must documents be verified first) are [TBC] (.ai/BUSINESS_RULES.md #16).',
        'No inventory table exists yet to snapshot availability against (see /admin/inventory).'
      ]}
    />
  )
}

export default DrawProcessPage
