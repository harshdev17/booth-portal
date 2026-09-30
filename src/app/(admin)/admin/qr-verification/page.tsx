import type { Metadata } from 'next'

import { QrCodeIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'QR Verification — IGM Admin Portal'
}

const QrVerificationPage = async () => {
  await requirePermission('qr:decode')

  return (
    <ModulePending
      title='QR Verification'
      icon={<QrCodeIcon className='size-6' />}
      description='Resolve an allotment QR token to permitted allotment details for on-ground verification, with every scan audit-logged.'
    />
  )
}

export default QrVerificationPage
