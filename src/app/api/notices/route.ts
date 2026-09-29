import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

/**
 * Public: list active homepage notices for the marquee ticker
 * (HeaderMarquee.tsx), in display order. Read-only, no PII — same rate
 * limit bucket/config as /api/categories since both are lightweight,
 * public, cacheable reads.
 */
export async function GET(request: Request) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('notices.list', ipAddress ?? 'unknown', RATE_LIMITS.categoryRead)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  try {
    const notices = await query<Array<{ id: number; text: string; text_hi: string | null }>>(
      `SELECT id, text, text_hi FROM notices WHERE status = 'active' ORDER BY display_order ASC`
    )

    return NextResponse.json({
      notices: notices.map(n => ({ id: n.id, text: n.text, textHi: n.text_hi }))
    })
  } catch (error) {
    logServerError('api.notices.list', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
