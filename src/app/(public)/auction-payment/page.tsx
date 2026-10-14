import type { Metadata } from 'next'

import ComingSoonSection from '@/components/public/ComingSoonSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Draw Payment | International Geeta Jayanti Mahotsav 2026'
}

const AuctionPaymentPage = () => {
  return (
    <>
      <PublicHeader />
      <ComingSoonSection
        titleEn='Draw Payment'
        titleHi='ड्रॉ भुगतान'
        messageEn='Draw payment will be available after the result is declared.'
        messageHi='ड्रॉ भुगतान परिणाम घोषित होने के बाद उपलब्ध होगा।'
      />
      <PublicFooter />
    </>
  )
}

export default AuctionPaymentPage
