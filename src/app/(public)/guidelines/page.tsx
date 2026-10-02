import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import GuidelinesView from '@/views/public/guidelines'

export const metadata: Metadata = {
  title: 'Guidelines | International Geeta Jayanti Mahotsav 2026'
}

const GuidelinesPage = () => {
  return (
    <>
      <PublicHeader />
      <GuidelinesView />
      <PublicFooter />
    </>
  )
}

export default GuidelinesPage
