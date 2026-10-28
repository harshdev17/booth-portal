import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { listCategoryMaps, listOpenCategoriesWithMaps } from '@/lib/settings/category-maps'
import StallBoothLocationsView from '@/views/public/stall-booth-locations'

export const metadata: Metadata = {
  title: 'Stall/Booth Locations | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic (not ISR): see src/app/(public)/page.tsx for why a
// per-request CSP nonce is incompatible with caching this route.
export const dynamic = 'force-dynamic'

const StallBoothLocationsPage = async () => {
  const [{ fullMap }, categories] = await Promise.all([listCategoryMaps(), listOpenCategoriesWithMaps()])

  return (
    <>
      <PublicHeader />
      <StallBoothLocationsView fullMap={fullMap} categories={categories} />
      <PublicFooter />
    </>
  )
}

export default StallBoothLocationsPage
