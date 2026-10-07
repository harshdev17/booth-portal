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
      <div className='kdb-form-scale'>
        <SuccessPageView
          applicationNumber={decodedApplicationNumber}
          encryptedToken={encodeApplicationNumber(decodedApplicationNumber)}
        />
      </div>
      <PublicFooter />
    </>
  )
}

export default SuccessPage
