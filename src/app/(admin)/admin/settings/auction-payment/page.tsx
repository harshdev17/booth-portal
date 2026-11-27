import type { Metadata } from 'next'

import { requirePermission } from '@/lib/rbac/authorize'
import { getAuctionPaymentSettings } from '@/lib/settings/auction-payment'
import AuctionPaymentSettingsClient from '@/views/admin/settings/AuctionPaymentSettingsClient'

export const metadata: Metadata = {
  title: 'Auction Payment — IGM Admin Portal'
}

const AuctionPaymentSettingsPage = async () => {
  await requirePermission('config:manage')

  const settings = await getAuctionPaymentSettings()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Auction Payment</h1>
        <p className='text-sm text-muted-foreground'>
          Offline NEFT/RTGS bank-transfer instructions page for applicants who can&apos;t pay online — bank details,
          instructions, notice text, and the Google Form link for submitting transaction details are all edited here.
        </p>
      </div>

      <AuctionPaymentSettingsClient settings={settings} />
    </div>
  )
}

export default AuctionPaymentSettingsPage
