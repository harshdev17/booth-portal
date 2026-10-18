import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import AllotmentLetterView from '@/views/public/allotment-letter/AllotmentLetterView'

export const metadata: Metadata = {
  title: 'Allotment Letter | International Geeta Jayanti Mahotsav 2026'
}

const AllotmentLetterPage = () => {
  return (
    <>
      <PublicHeader />
      <main className='min-h-[calc(100vh-280px)] bg-slate-50/50 py-6'>
        <AllotmentLetterView />
      </main>
      <PublicFooter />
    </>
  )
}

export default AllotmentLetterPage
