import type { Metadata } from 'next'

import AboutSection from '@/components/public/AboutSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'About Us | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic (not ISR): see src/app/(public)/page.tsx for why a
// per-request CSP nonce is incompatible with caching this route.
export const dynamic = 'force-dynamic'

const AboutPage = () => {
  return (
    <>
      <PublicHeader />
      <AboutSection />
      <PublicFooter />
    </>
  )
}

export default AboutPage
