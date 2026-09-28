import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verifyOtp } from '@/lib/notifications/otp'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const verifySchema = z.object({
  mobileNumber: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code')
})

/** Verifies a previously requested WhatsApp OTP. See /api/otp/request. */
export async function POST(request: Request) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('otp.verify.ip', ipAddress ?? 'unknown', RATE_LIMITS.otpVerify)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  let rawBody: unknown

  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const parsed = verifySchema.safeParse(rawBody)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter the 6-digit code sent to your WhatsApp.' }, { status: 400 })
  }

  try {
    const result = await verifyOtp({
      mobileNumber: `+91${parsed.data.mobileNumber}`,
      purpose: 'applicant_mobile_verification',
      code: parsed.data.code
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ verified: true })
  } catch (error) {
    logServerError('api.otp.verify', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
