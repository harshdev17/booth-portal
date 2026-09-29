import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyAccessToken } from '@/lib/applications/access-token'
import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const summarySchema = z.object({
  applicationNumber: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^KDB-\d{4}-\d{6}$/, 'Enter a valid application number'),
  accessToken: z.string().trim().min(1).max(128)
})

/**
 * Application summary for the pages an applicant lands on immediately after
 * finalizing (Success, Payment) — the SAME browser session that was just
 * issued the access token, not a later return visit. Deliberately kept
 * separate from the public /api/applications/status endpoint, which now
 * requires WhatsApp OTP verification for a returning visitor checking
 * status later (see .ai/DECISIONS.md) — that protection doesn't apply here
 * since the token was issued moments ago in this same tab.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited('applications.summary', rateLimitKey, RATE_LIMITS.statusLookup)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = summarySchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid application number and access code.' }, { status: 400 })
  }

  try {
    const rows = await query<
      Array<{
        id: number
        status: string
        access_token_hash: string
        category_name: string
        category_slug: string
        fee_paise: number | null
        fee_base_paise: number | null
        gst_percent: number | string | null
        submitted_at: string | null
      }>
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
      applicationId: application.id,
      status: application.status,
      categoryName: application.category_name,
      categorySlug: application.category_slug,
      feePaise: application.fee_paise,
      feeBasePaise: application.fee_base_paise,
      gstPercent: application.gst_percent ? Number(application.gst_percent) : null,
      submittedAt: application.submitted_at
    })
  } catch (error) {
    logServerError('api.applications.summary', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
