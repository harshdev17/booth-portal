import type { Metadata } from 'next'

import { Settings2Icon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Razorpay Settings — KDB Admin Portal'
}

const RazorpaySettingsPage = async () => {
  await requirePermission('config:manage')

  return (
    <ModulePending
      title='Razorpay Settings'
      icon={<Settings2Icon className='size-6' />}
      description='Configure the Razorpay key ID, activation state, and webhook settings used for fee collection.'
      phase='Phase 8 (Payments)'
      blockedBy={[
        'The Razorpay integration itself does not exist yet (see /admin/payments) — settings for it come after the integration, not before.',
        'Per .ai/SECURITY.md, the Razorpay secret key must never be editable/visible from this UI in plaintext once built — only the key ID and an activation toggle should live here, with the secret stored server-side only.'
      ]}
    />
  )
}

export default RazorpaySettingsPage
