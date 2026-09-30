import type { Metadata } from 'next'

import { ClipboardCheckIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Shop Allotment — IGM Admin Portal'
}

const ShopAllotmentPage = async () => {
  await requirePermission('allotment:perform')

  return (
    <ModulePending
      title='Shop Allotment'
      icon={<ClipboardCheckIcon className='size-6' />}
      description='Assign a specific shop unit to a Selected applicant and generate the allotment letter with a secure QR code.'
    />
  )
}

export default ShopAllotmentPage
