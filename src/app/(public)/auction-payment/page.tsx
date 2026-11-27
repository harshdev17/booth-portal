import type { Metadata } from 'next'

import ComingSoonSection from '@/components/public/ComingSoonSection'
import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { getAuctionPaymentSettings } from '@/lib/settings/auction-payment'
import AuctionPaymentView from '@/views/public/auction-payment'

export const metadata: Metadata = {
  title: 'Auction Payment | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic — see src/app/(public)/allotment-letter/page.tsx for why a
// per-request CSP nonce is incompatible with a statically cached/prerendered
// page (it gets stuck on load with every inline script silently blocked).
export const dynamic = 'force-dynamic'

/**
 * `enabled` (auction_payment_settings, migration 0097) gates whether this
 * page shows its real admin-configured content or falls back to the
 * existing Coming Soon notice — kept rather than removed, since the admin
 * may still want this exact "not live yet" state before a Google Form link
 * is actually in hand.
 */
const AuctionPaymentPage = async () => {
  const settings = await getAuctionPaymentSettings()

  return (
    <>
      <PublicHeader />
      {settings.enabled ? (
        <AuctionPaymentView settings={settings} />
      ) : (
        <ComingSoonSection
          titleEn='Auction Payment'
          titleHi='नीलामी भुगतान'
          messageEn='Auction payment details will be available soon.'
          messageHi='नीलामी भुगतान का विवरण शीघ्र ही उपलब्ध होगा।'
        />
      )}
      <PublicFooter />
    </>
  )
}

export default AuctionPaymentPage
