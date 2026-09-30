import type { Metadata } from 'next'

import ComingSoonSection from '@/components/public/ComingSoonSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Result | International Gita Mahotsav 2026'
}

const ResultPage = () => {
  return (
    <>
      <PublicHeader />
      <ComingSoonSection titleEn='Result' titleHi='परिणाम' />
      <PublicFooter />
    </>
  )
}

export default ResultPage
