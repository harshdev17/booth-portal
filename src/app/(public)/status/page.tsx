import { Suspense } from 'react'

import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import StatusLookup from '@/views/public/status'

export const metadata: Metadata = {
  title: 'Application Status | International Geeta Jayanti Mahotsav 2026'
}

const StatusPage = () => {
  return (
    <>
      <PublicHeader />
      {/* StatusLookup reads ?appNo= via useSearchParams, which requires a Suspense boundary in the App Router */}
      <Suspense>
        <StatusLookup />
      </Suspense>
      <PublicFooter />
    </>
  )
}

export default StatusPage
