import type { Metadata } from 'next'

import ComingSoonSection from '@/components/public/ComingSoonSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Allotment Letter | International Geeta Jayanti Mahotsav 2026'
}

const AllotmentLetterPage = () => {
  return (
    <>
      <PublicHeader />
      <ComingSoonSection
        titleEn='Allotment Letter'
        titleHi='आवंटन पत्र'
        messageEn='Allotment letters will be available to download here once booth/stall allotment is complete.'
        messageHi='बूथ/स्टॉल आवंटन पूर्ण होने के बाद आवंटन पत्र यहाँ डाउनलोड के लिए उपलब्ध होगा।'
      />
      <PublicFooter />
    </>
  )
}

export default AllotmentLetterPage
