import { NextResponse } from 'next/server'
import { z } from 'zod'

import { query } from '@/lib/db/client'
import { requestOtp } from '@/lib/notifications/otp'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const requestSchema = z.object({
  mobileNumber: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  applicationId: z.number().int().positive().optional()
})

/**
 * Sends a 6-digit WhatsApp OTP via AiSensy to verify an applicant's mobile
 * number is genuinely theirs (see .ai/NOTIFICATIONS.md, .ai/DECISIONS.md).
 * Rate-limited per IP and per mobile number to prevent using this endpoint
 * to spam a third party's WhatsApp number.
 */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)
  const rateLimitKeyIp = ipAddress ?? 'unknown'

  if (isRateLimited('otp.request.ip', rateLimitKeyIp, RATE_LIMITS.otpRequest)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid 10-digit mobile number.' }, { status: 400 })
  }

  if (isRateLimited('otp.request.mobile', parsed.data.mobileNumber, RATE_LIMITS.otpRequest)) {
    return NextResponse.json({ error: 'Too many verification codes requested for this number. Please try again later.' }, { status: 429 })
  }

  try {
    // The code is also emailed to the address ON THE APPLICATION (looked up
    // server-side and only when the mobile matches it) — never an address
    // supplied by the client, so this cannot be used to mail arbitrary people.
    let email: string | null = null

    if (parsed.data.applicationId) {
      const rows = await query<Array<{ email: string }>>(
        'SELECT email FROM applications WHERE id = ? AND mobile_number = ? LIMIT 1',
        [parsed.data.applicationId, parsed.data.mobileNumber]
      )

      email = rows[0]?.email ?? null
    }

    const result = await requestOtp({
      mobileNumber: `+91${parsed.data.mobileNumber}`,
      purpose: 'applicant_mobile_verification',
      applicationId: parsed.data.applicationId,
      ipAddress,
      email
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    const maskedEmail = email ? email.replace(/^(.).*(@.*)$/, (_m, first: string, domain: string) => `${first}•••${domain}`) : null

    return NextResponse.json({ sent: true, maskedEmail })
  } catch (error) {
    logServerError('api.otp.request', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
