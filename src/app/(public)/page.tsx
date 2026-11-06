import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PublicHome from '@/views/public/home'

export const metadata: Metadata = {
  title: 'International Gita Jayanti Mahotsav 2026 Booth/Stall Online Application Portal',
  description:
    'Online Applications are hereby invited for Social Organisation/Individuals/Firms/Companies/Agencies/Government/Boards/Corporations stalls/booths at International Gita Jayanti Mahotsav 2026. Interested applicants can apply online after checking the eligibility criteria and guidelines for their chosen category.'
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
