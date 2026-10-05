import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import ReceiptPageView from '@/views/public/apply-receipt/ReceiptPageView'

export const metadata: Metadata = {
  title: 'Payment Receipt | International Geeta Jayanti Mahotsav 2026'
}

const ReceiptPage = async ({ params }: { params: Promise<{ applicationNumber: string }> }) => {
  const { applicationNumber } = await params

  return (
    <>
      <PublicHeader />
      <ReceiptPageView applicationNumber={decodeURIComponent(applicationNumber)} />
      <PublicFooter />
    </>
  )
}

export default ReceiptPage
