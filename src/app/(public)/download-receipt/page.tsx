import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import DownloadReceipt from '@/views/public/download-receipt'

export const metadata: Metadata = {
  title: 'Download Payment Receipt | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic — see src/app/(public)/allotment-letter/page.tsx for why a
// per-request CSP nonce is incompatible with a statically cached/prerendered
// page (it gets stuck on load with every inline script silently blocked).
export const dynamic = 'force-dynamic'

const DownloadReceiptPage = () => {
  return (
    <>
      <PublicHeader />
      <DownloadReceipt />
      <PublicFooter />
    </>
  )
}

export default DownloadReceiptPage
