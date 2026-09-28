import type { Metadata } from 'next'

import { ClipboardCheckIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Shop Allotment — KDB Admin Portal'
}

const ShopAllotmentPage = async () => {
  await requirePermission('allotment:perform')

  return (
    <ModulePending
      title='Shop Allotment'
      icon={<ClipboardCheckIcon className='size-6' />}
      description='Assign a specific shop unit to a Selected applicant and generate the allotment letter with a secure QR code.'
      phase='Phase 9 (Inventory / Draw / Allotment)'
      blockedBy={[
        'Depends on the Inventory module (physical shop units with state) which does not exist yet — see /admin/inventory.',
        'Allotment letter (with QR) can only be generated once application is Selected + required payment(s) verified + a shop unit allotted (.ai/BUSINESS_RULES.md #4) — the Payments module this depends on is not built yet either.',
        'Cancellation trigger conditions and whether re-allotment is waitlist-sourced or purely manual are [TBC] (.ai/BUSINESS_RULES.md #18, #19).'
      ]}
    />
  )
}

export default ShopAllotmentPage
