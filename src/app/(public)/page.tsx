import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PublicHome from '@/views/public/home'

export const metadata: Metadata = {
  title: 'Stall Allotment | International Geeta Jayanti Mahotsav 2026',
  description: 'Official information regarding stall categories, allotment and application for International Geeta Jayanti Mahotsav 2026, Kurukshetra Development Board.'
}

// Categories are admin-configurable data (.ai/HOMEPAGE.md), so this page
// must reflect the current database state on every request rather than
// being statically generated at build time.
export const dynamic = 'force-dynamic'

const HomePage = () => {
  return (
    <>
      <PublicHeader />
      <PublicHome />
      <PublicFooter />
    </>
  )
}

export default HomePage
