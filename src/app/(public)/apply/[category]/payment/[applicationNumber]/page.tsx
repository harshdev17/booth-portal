import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PaymentPageView from '@/views/public/apply-payment/PaymentPageView'

export const metadata: Metadata = {
  title: 'Pay Application Fee | International Geeta Jayanti Mahotsav 2026'
}

const PaymentPage = async ({
  params
}: {
  params: Promise<{ category: string; applicationNumber: string }>
}) => {
  const { category, applicationNumber } = await params

  return (
    <>
      <PublicHeader />
      <PaymentPageView categorySlug={category} applicationNumber={decodeURIComponent(applicationNumber)} />
      <PublicFooter />
    </>
  )
}

export default PaymentPage
