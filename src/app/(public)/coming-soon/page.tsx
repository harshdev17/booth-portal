import type { Metadata } from 'next'

import ComingSoonView from '@/views/public/coming-soon'

export const metadata: Metadata = {
  title: 'Coming Soon | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic — see src/app/(public)/allotment-letter/page.tsx for why a
// per-request CSP nonce is incompatible with a statically cached/prerendered
// page (it gets stuck on load with every inline script silently blocked).
export const dynamic = 'force-dynamic'

const ComingSoonPage = () => <ComingSoonView />

export default ComingSoonPage
