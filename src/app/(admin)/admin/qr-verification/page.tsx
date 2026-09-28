import type { Metadata } from 'next'

import { QrCodeIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'QR Verification — KDB Admin Portal'
}

const QrVerificationPage = async () => {
  await requirePermission('qr:decode')

  return (
    <ModulePending
      title='QR Verification'
      icon={<QrCodeIcon className='size-6' />}
      description='Resolve an allotment QR token to permitted allotment details for on-ground verification, with every scan audit-logged.'
      phase='Phase 10 (QR / Document Verification)'
      blockedBy={[
        'QR tokens are generated at allotment finalization (.ai/QR_VERIFICATION.md, .ai/DECISIONS.md #4) — since no allotment exists yet (see /admin/allotment), there is nothing to resolve.',
        'Token expiry/revocation policy is [TBC – Business Confirmation Required] (.ai/BUSINESS_RULES.md #TBC list, .ai/QR_VERIFICATION.md).'
      ]}
    />
  )
}

export default QrVerificationPage
