import type { Metadata } from 'next'

import ContactBannerSection from '@/components/public/ContactBannerSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'

export const metadata: Metadata = {
  title: 'Contact Us | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic (not ISR): see src/app/(public)/page.tsx for why a
// per-request CSP nonce is incompatible with caching this route.
export const dynamic = 'force-dynamic'

const ContactPage = () => {
  return (
    <>
      <PublicHeader />
      <ContactBannerSection />
      <PublicFooter />
    </>
  )
}

export default ContactPage
