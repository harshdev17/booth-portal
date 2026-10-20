import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PublicHome from '@/views/public/home'

export const metadata: Metadata = {
  title: 'Booth/Stall Allotment | International Geeta Jayanti Mahotsav 2026',
  description: 'Official information regarding booth/stall categories, allotment and application for International Geeta Jayanti Mahotsav 2026, Kurukshetra Development Board.'
}

// Forced dynamic (not ISR): the CSP nonce proxy.ts sets per-request only
// matches the inline hydration scripts on the SAME response, so any cached/
// prerendered copy of this page inevitably ships a stale nonce that cannot
// match the freshly generated CSP header, blocking all scripts. See
// src/proxy.ts and .ai/DECISIONS.md decision #11.
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
