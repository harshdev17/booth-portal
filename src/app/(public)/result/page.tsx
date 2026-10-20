import type { Metadata } from 'next'

import ComingSoonSection from '@/components/public/ComingSoonSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Result | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic — see src/app/(public)/allotment-letter/page.tsx for why a
// per-request CSP nonce is incompatible with a statically cached/prerendered
// page (it gets stuck on load with every inline script silently blocked).
export const dynamic = 'force-dynamic'

const ResultPage = () => {
  return (
    <>
      <PublicHeader />
      <ComingSoonSection
        titleEn='Result'
        titleHi='परिणाम'
        messageEn='Result has not been declared yet.'
        messageHi='परिणाम अभी घोषित नहीं हुआ है।'
      />
      <PublicFooter />
    </>
  )
}

export default ResultPage
