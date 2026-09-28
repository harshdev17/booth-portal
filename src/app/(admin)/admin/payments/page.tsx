import type { Metadata } from 'next'

import { CreditCardIcon } from 'lucide-react'

import ModulePending from '@/components/shared/ModulePending'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Payments — KDB Admin Portal'
}

const PaymentsAdminPage = async () => {
  await requirePermission('payment:view')

  return (
    <ModulePending
      title='Payments'
      icon={<CreditCardIcon className='size-6' />}
      description='View, reconcile, and manage registration/shop fee payments collected via Razorpay.'
      phase='Phase 8 (Payments)'
      blockedBy={[
        'No payments table exists yet — applications currently only carry a status (payment_pending / payment_success), not a transaction ledger.',
        'Razorpay order creation + webhook signature verification are not implemented (.ai/PAYMENT.md, .ai/SECURITY.md).',
        'Category-specific fees vs. flat fee is [TBC – Business Confirmation Required] (.ai/BUSINESS_RULES.md #14).',
        'Refund eligibility rules on cancellation are [TBC – Business Confirmation Required] (.ai/BUSINESS_RULES.md #15).'
      ]}
    />
  )
}

export default PaymentsAdminPage
