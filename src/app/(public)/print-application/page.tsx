import { Suspense } from 'react'

import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PrintApplication from '@/views/public/print-application'

export const metadata: Metadata = {
  title: 'Print Application | International Geeta Jayanti Mahotsav 2026'
}

const PrintApplicationPage = () => {
  return (
    <>
      <PublicHeader />
      {/* PrintApplication reads ?appNo= via useSearchParams, which requires a Suspense boundary in the App Router */}
      <Suspense>
        <PrintApplication />
      </Suspense>
      <PublicFooter />
    </>
  )
}

export default PrintApplicationPage
