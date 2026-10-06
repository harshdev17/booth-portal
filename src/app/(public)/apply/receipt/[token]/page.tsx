import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { decodeApplicationNumber } from '@/lib/security/opaque-id'
import ReceiptPageView from '@/views/public/apply-receipt/ReceiptPageView'

export const metadata: Metadata = {
  title: 'Payment Receipt | International Geeta Jayanti Mahotsav 2026'
}

const ReceiptPage = async ({ params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const applicationNumber = decodeApplicationNumber(decodeURIComponent(token))

  if (!applicationNumber) notFound()

  return (
    <>
      <PublicHeader />
      <ReceiptPageView applicationNumber={applicationNumber} />
      <PublicFooter />
    </>
  )
}

export default ReceiptPage
