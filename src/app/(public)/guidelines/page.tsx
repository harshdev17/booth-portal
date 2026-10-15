import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { listCategoryMaps } from '@/lib/settings/category-maps'
import GuidelinesView from '@/views/public/guidelines'

export const metadata: Metadata = {
  title: 'Guidelines | International Geeta Jayanti Mahotsav 2026'
}

const GuidelinesPage = async () => {
  const { byCategory } = await listCategoryMaps()
  const mapPdfBySlug = Object.fromEntries(byCategory.map(row => [row.categorySlug, row.pdfPath]))

  return (
    <>
      <PublicHeader />
      <GuidelinesView mapPdfBySlug={mapPdfBySlug} />
      <PublicFooter />
    </>
  )
}

export default GuidelinesPage
