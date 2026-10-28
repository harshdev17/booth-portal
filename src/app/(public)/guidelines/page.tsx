import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { getPortalApplicationSchedule, listCategoryImportantDates } from '@/lib/applications/categories'
import { listCategoryMaps } from '@/lib/settings/category-maps'
import GuidelinesView from '@/views/public/guidelines'

export const metadata: Metadata = {
  title: 'Guidelines | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic (not ISR): see src/app/(public)/page.tsx for why a
// per-request CSP nonce is incompatible with caching this route.
export const dynamic = 'force-dynamic'

const GuidelinesPage = async () => {
  const [{ byCategory }, schedule, importantDates] = await Promise.all([
    listCategoryMaps(),
    getPortalApplicationSchedule(),
    listCategoryImportantDates()
  ])
  const mapPdfBySlug = Object.fromEntries(byCategory.map(row => [row.categorySlug, row.pdfPath]))
  const importantDatesBySlug = Object.fromEntries(
    importantDates.map(row => [row.slug, { note: row.importantDatesNote, noteHi: row.importantDatesNoteHi }])
  )

  return (
    <>
      <PublicHeader />
      <GuidelinesView
        mapPdfBySlug={mapPdfBySlug}
        applicationOpensAt={schedule.applicationOpensAt}
        applicationClosesAt={schedule.applicationClosesAt}
        importantDatesBySlug={importantDatesBySlug}
      />
      <PublicFooter />
    </>
  )
}

export default GuidelinesPage
