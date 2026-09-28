import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import StatusLookup from '@/views/public/status'

export const metadata: Metadata = {
  title: 'Application Status | International Gita Mahotsav 2026'
}

const StatusPage = () => {
  return (
    <>
      <PublicHeader />
      <StatusLookup />
      <PublicFooter />
    </>
  )
}

export default StatusPage
