import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { listCategoryMaps } from '@/lib/settings/category-maps'
import StallBoothLocationsView from '@/views/public/stall-booth-locations'

export const metadata: Metadata = {
  title: 'Stall/Booth Locations | International Geeta Jayanti Mahotsav 2026'
}

const StallBoothLocationsPage = async () => {
  const { fullMap, byCategory } = await listCategoryMaps()

  return (
    <>
      <PublicHeader />
      <StallBoothLocationsView fullMap={fullMap} categoryMaps={byCategory} />
      <PublicFooter />
    </>
  )
}

export default StallBoothLocationsPage
