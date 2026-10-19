import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PublicHome from '@/views/public/home'

export const metadata: Metadata = {
  title: 'Booth/Stall Allotment | International Geeta Jayanti Mahotsav 2026',
  description: 'Official information regarding booth/stall categories, allotment and application for International Geeta Jayanti Mahotsav 2026, Kurukshetra Development Board.'
}

// Revalidate landing page in the background every 60 seconds (ISR).
// This serves visitors instantaneously in ~10ms from edge/memory cache
// without executing remote database round-trips on every page hit.
export const revalidate = 60

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
