import { NextResponse } from 'next/server'

import { isComingSoonEnabled } from '@/lib/site/coming-soon'

// Read by src/proxy.ts on every public request (the proxy runs in the edge
// runtime and cannot reach MySQL itself). Exposes one boolean only.
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ comingSoon: await isComingSoonEnabled() }, { headers: { 'Cache-Control': 'no-store' } })
}
