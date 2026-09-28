import { NextResponse } from 'next/server'

import { getFeeBreakdown, listOpenCategories } from '@/lib/applications/categories'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

/** Public: list categories currently open for application. Read-only, no PII. */
export async function GET(request: Request) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('categories.list', ipAddress ?? 'unknown', RATE_LIMITS.categoryRead)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  try {
    const categories = await listOpenCategories()

    return NextResponse.json({
      categories: categories.map(c => {
        const fee = getFeeBreakdown(c)

        return {
          slug: c.slug,
          name: c.name,
          nameHi: c.name_hi,
          description: c.description,
          descriptionHi: c.description_hi,
          selectionMethod: c.selection_method,
          feePaise: fee?.totalPaise ?? null,
          feeBasePaise: fee?.basePaise ?? null,
          gstPercent: fee?.gstPercent ?? null,
          applicationOpensAt: c.application_opens_at,
          applicationClosesAt: c.application_closes_at
        }
      })
    })
  } catch (error) {
    logServerError('api.categories.list', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
