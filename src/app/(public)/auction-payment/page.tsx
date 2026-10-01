import type { Metadata } from 'next'

import ComingSoonSection from '@/components/public/ComingSoonSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Auction Payment | International Geeta Jayanti Mahotsav 2026'
}

const AuctionPaymentPage = () => {
  return (
    <>
      <PublicHeader />
      <ComingSoonSection
        titleEn='Auction Payment'
        titleHi='नीलामी भुगतान'
        messageEn='Auction payment will be available after the result is declared.'
        messageHi='नीलामी भुगतान परिणाम घोषित होने के बाद उपलब्ध होगा।'
      />
      <PublicFooter />
    </>
  )
}

export default AuctionPaymentPage
