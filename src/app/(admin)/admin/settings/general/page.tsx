import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import CategoryFeeSettingsClient from '@/views/admin/settings/CategoryFeeSettingsClient'

export const metadata: Metadata = {
  title: 'Fee & Category Settings — KDB Admin Portal'
}

type CategoryRow = {
  id: number
  name: string
  name_hi: string | null
  slug: string
  selection_method: string
  fee_paise: number | null
  fee_base_paise: number | null
  gst_percent: number | string | null
  status: string
  application_opens_at: string | null
  application_closes_at: string | null
  auction_date: string | null
  auction_venue: string | null
  auction_venue_hi: string | null
}

const GeneralSettingsPage = async () => {
  // Authorize server-side
  await requirePermission('config:manage')

  const categories = await query<CategoryRow[]>(
    `SELECT id, name, name_hi, slug, selection_method, fee_paise, fee_base_paise, gst_percent, status,
            application_opens_at, application_closes_at, auction_date, auction_venue, auction_venue_hi
     FROM categories
     ORDER BY display_order ASC`
  )

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Fees, GST & Categories Configuration</h1>
        <p className='text-sm text-muted-foreground'>
          Configure application fees, GST tax rates, and parameters for all International Gita Mahotsav stall categories.
        </p>
      </div>

      <CategoryFeeSettingsClient categories={categories} />
    </div>
  )
}

export default GeneralSettingsPage
