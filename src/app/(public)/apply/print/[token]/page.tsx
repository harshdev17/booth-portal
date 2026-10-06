import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { decodeApplicationNumber } from '@/lib/security/opaque-id'
import PrintPageView from '@/views/public/apply-print/PrintPageView'

export const metadata: Metadata = {
  title: 'Print Application | International Geeta Jayanti Mahotsav 2026'
}

const PrintPage = async ({ params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const applicationNumber = decodeApplicationNumber(decodeURIComponent(token))

  if (!applicationNumber) notFound()

  return (
    <>
      <PublicHeader />
      <PrintPageView applicationNumber={applicationNumber} />
      <PublicFooter />
    </>
  )
}

export default PrintPage
