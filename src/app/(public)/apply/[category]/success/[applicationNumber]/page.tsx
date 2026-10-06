import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { encodeApplicationNumber } from '@/lib/security/opaque-id'
import SuccessPageView from '@/views/public/apply-success/SuccessPageView'

export const metadata: Metadata = {
  title: 'Application Submitted | International Geeta Jayanti Mahotsav 2026'
}

const SuccessPage = async ({ params }: { params: Promise<{ applicationNumber: string }> }) => {
  const { applicationNumber } = await params
  const decodedApplicationNumber = decodeURIComponent(applicationNumber)

  return (
    <>
      <PublicHeader />
      <SuccessPageView
        applicationNumber={decodedApplicationNumber}
        encryptedToken={encodeApplicationNumber(decodedApplicationNumber)}
      />
      <PublicFooter />
    </>
  )
}

export default SuccessPage
