import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import DownloadReceipt from '@/views/public/download-receipt'

export const metadata: Metadata = {
  title: 'Download Payment Receipt | International Geeta Jayanti Mahotsav 2026'
}

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
