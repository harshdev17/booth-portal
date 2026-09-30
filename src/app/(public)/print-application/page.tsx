import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import PrintApplication from '@/views/public/print-application'

export const metadata: Metadata = {
  title: 'Print Application | International Gita Mahotsav 2026'
}

const PrintApplicationPage = () => {
  return (
    <>
      <PublicHeader />
      <PrintApplication />
      <PublicFooter />
    </>
  )
}

export default PrintApplicationPage
