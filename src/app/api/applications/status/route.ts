import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const statusLookupSchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^KDB-\d{4}-\d{6}$/, 'Enter a valid application number'),
  accessToken: z.string().trim().min(1).max(128)
})

type StatusRow = {
  id: number
  status: string
  access_token_hash: string
  category_name: string
  submitted_at: string | null
}

/**
 * Public status lookup by application number, requiring the applicant's own
 * access token — deliberately NOT lookup-by-mobile-number-alone, which
 * would let anyone probe for a mobile number's associated applications.
 * Both values must be correct together; the response does not distinguish
 * "wrong application number" from "wrong token" (avoids enumeration/oracle
 * behavior).
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.status', rateLimitKey, RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = statusLookupSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid application number and access code.' }, { status: 400 })
  }

  try {
    const rows = await query<
      Array<
        StatusRow & {
          category_slug: string
          fee_paise: number | null
          fee_base_paise: number | null
          gst_percent: number | string | null
        }
      >
    >(
      `SELECT a.id, a.status, a.access_token_hash, c.name AS category_name, c.slug AS category_slug,
              c.fee_paise, c.fee_base_paise, c.gst_percent, a.submitted_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.application_number = ?
       LIMIT 1`,
      [parsed.data.applicationNumber]
    )

    const application = rows[0]

    if (!application || !verifyAccessToken(parsed.data.accessToken, application.access_token_hash)) {
      return NextResponse.json({ error: 'Application not found or access code incorrect.' }, { status: 404 })
    }

    return NextResponse.json({
      status: application.status,
      categoryName: application.category_name,
      categorySlug: application.category_slug,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      submittedAt: application.submitted_at
    })
  } catch (error) {
    logServerError('api.applications.status', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
