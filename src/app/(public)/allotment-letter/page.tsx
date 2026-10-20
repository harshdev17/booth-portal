import { Suspense } from 'react'

import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import AllotmentLetterView from '@/views/public/allotment-letter/AllotmentLetterView'

export const metadata: Metadata = {
  title: 'Allotment Letter | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic (not statically prerendered): the CSP nonce proxy.ts sets
// per-request only matches the inline hydration scripts on the SAME
// response, so any cached/prerendered copy of this page inevitably ships a
// stale nonce that cannot match the freshly generated CSP header, blocking
// all scripts (the page gets stuck on "Loading..." forever). See
// src/proxy.ts, .ai/DECISIONS.md decision #11, and the identical fix
// already applied to src/app/(public)/page.tsx and others.
export const dynamic = 'force-dynamic'

const AllotmentLetterPage = () => {
  return (
    <>
      <PublicHeader />
      <main className='min-h-[calc(100vh-280px)] bg-slate-50/50 py-6'>
        <Suspense fallback={<div className='py-20 text-center text-sm text-slate-500'>Loading allotment letter...</div>}>
          <AllotmentLetterView />
        </Suspense>
      </main>
      <PublicFooter />
    </>
  )
}

export default AllotmentLetterPage
