import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import SuccessPageView from '@/views/public/apply-success/SuccessPageView'

export const metadata: Metadata = {
  title: 'Application Submitted | International Gita Mahotsav 2026'
}

const SuccessPage = async ({ params }: { params: Promise<{ applicationNumber: string }> }) => {
  const { applicationNumber } = await params

  return (
    <>
      <PublicHeader />
      <SuccessPageView applicationNumber={decodeURIComponent(applicationNumber)} />
      <PublicFooter />
    </>
  )
}

export default SuccessPage
