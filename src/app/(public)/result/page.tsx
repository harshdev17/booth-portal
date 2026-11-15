import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { listResultDocuments } from '@/lib/draw/result-documents'
import ResultView from '@/views/public/result'

export const metadata: Metadata = {
  title: 'Result | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic — see src/app/(public)/allotment-letter/page.tsx for why a
// per-request CSP nonce is incompatible with a statically cached/prerendered
// page (it gets stuck on load with every inline script silently blocked).
export const dynamic = 'force-dynamic'

const ResultPage = async () => {
  const documents = await listResultDocuments()

  return (
    <>
      <PublicHeader />
      <ResultView documents={documents} />
      <PublicFooter />
    </>
  )
}

export default ResultPage
