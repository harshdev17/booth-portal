import 'server-only'

import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

import { query } from '@/lib/db/client'
import { sendNotification } from '@/lib/notifications/service'

// WhatsApp OTP verification via AiSensy, per .ai/NOTIFICATIONS.md and the
// decision to use AiSensy as the WhatsApp provider (see .ai/DECISIONS.md).
// Mirrors the hash-only-storage principle already used for application
// access tokens (src/lib/applications/access-token.ts) and passwords: only
// a SHA-256 hash of the 6-digit code is ever persisted.

const OTP_LENGTH = 6
const OTP_TTL_MINUTES = 10
const MAX_VERIFY_ATTEMPTS = 5

export type OtpPurpose = 'applicant_mobile_verification' | 'status_lookup' | 'print_application'

function generateCode(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0')
}

function hashCode(code: string, mobileNumber: string): string {
  // Bind the hash to the mobile number so a stolen hash cannot be replayed
  // against a different challenge row for the same code value.
  return createHash('sha256').update(`${code}:${mobileNumber}`).digest('hex')
}

export async function requestOtp(params: {
  mobileNumber: string
  purpose: OtpPurpose
  applicationId?: number
  ipAddress?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = generateCode()
  const codeHash = hashCode(code, params.mobileNumber)
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

  await query(
    `INSERT INTO otp_challenges (purpose, mobile_number, application_id, code_hash, max_attempts, expires_at, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [params.purpose, params.mobileNumber, params.applicationId ?? null, codeHash, MAX_VERIFY_ATTEMPTS, expiresAt, params.ipAddress ?? null]
  )

  const sent = await sendNotification({
    category: 'otp',
    destination: params.mobileNumber,
    userName: params.mobileNumber,
    templateParams: [code],

    // The template's "Copy Code" button requires the same code as its own
    // button parameter, separate from templateParams — see buttonParam's
    // doc comment in notifications/types.ts.
    buttonParam: code,
    applicationId: params.applicationId
  })

  if (!sent) {
    return { ok: false, error: 'Could not send the verification code. Please try again.' }
  }

  return { ok: true }
}

export async function verifyOtp(params: {
  mobileNumber: string
  purpose: OtpPurpose
  code: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await query<
    Array<{ id: number; code_hash: string; attempt_count: number; max_attempts: number; expires_at: string; verified_at: string | null }>
  >(
    `SELECT id, code_hash, attempt_count, max_attempts, expires_at, verified_at
     FROM otp_challenges
     WHERE mobile_number = ? AND purpose = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [params.mobileNumber, params.purpose]
  )

  const challenge = rows[0]

  if (!challenge) {
    return { ok: false, error: 'No verification code was requested for this number. Please request a new one.' }
  }

  if (challenge.verified_at) {
    return { ok: false, error: 'This code has already been used. Please request a new one.' }
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' }
  }

  const candidateHash = hashCode(params.code, params.mobileNumber)
  const a = Buffer.from(candidateHash, 'hex')
  const b = Buffer.from(challenge.code_hash, 'hex')
  const matches = a.length === b.length && timingSafeEqual(a, b)

  if (!matches) {
    await query('UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = ?', [challenge.id])

    return { ok: false, error: 'Incorrect code. Please try again.' }
  }

  // Deliberately a JS Date, not SQL's NOW() — the Hostinger MySQL server's
  // own clock runs in UTC (confirmed live: `SELECT NOW()` matches real UTC
  // time, not IST), and mysql2 stores/returns DATETIME columns without any
  // timezone marker. new Date(challenge.expires_at) above already only
  // works correctly because expires_at was written the same way, from a JS
  // Date, in requestOtp() below — using NOW() here for verified_at made
  // this one column silently drift ~5.5 hours from every other timestamp
  // in this flow, causing hasRecentVerifiedOtp() to treat a just-verified
  // OTP as already-expired. See .ai/CHANGELOG.md for the live repro.
  await query('UPDATE otp_challenges SET verified_at = ? WHERE id = ?', [new Date(), challenge.id])

  return { ok: true }
}

/**
 * Whether the given mobile number has a verified OTP challenge for this
 * purpose within the last `maxAgeMinutes` — used as a short-lived proof of
 * ownership for actions that happen just after OTP verification (document
 * re-upload from the status page, application finalize), without requiring
 * the client to resend the code on every follow-up request. Always the
 * server-side gate; never trust a client-reported "I verified" flag alone.
 */
export async function hasRecentVerifiedOtp(mobileNumber: string, purpose: OtpPurpose, maxAgeMinutes: number): Promise<boolean> {
  const rows = await query<Array<{ verified_at: string | null }>>(
    `SELECT verified_at FROM otp_challenges
     WHERE mobile_number = ? AND purpose = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [mobileNumber, purpose]
  )

  const verifiedAt = rows[0]?.verified_at

  if (!verifiedAt) return false

  return Date.now() - new Date(verifiedAt).getTime() < maxAgeMinutes * 60 * 1000
}
