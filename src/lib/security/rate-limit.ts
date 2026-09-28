import 'server-only'

/**
 * General-purpose in-memory fixed-window rate limiter, keyed by an arbitrary
 * bucket name plus caller-supplied identity (IP, mobile, application id,
 * etc.), for the new public endpoints (application submission, document
 * upload, status lookup). Same known limitation as src/lib/auth/rate-limit.ts
 * (single-instance, resets on restart) and the same acceptance rationale —
 * see that file's comment. Kept as a separate module rather than generalizing
 * the login limiter in place, to avoid touching already-verified auth code.
 */

type Bucket = { count: number; windowStart: number }

const buckets = new Map<string, Bucket>()

export type RateLimitConfig = {
  windowMs: number
  maxAttempts: number
}

export const RATE_LIMITS = {
  applicationSubmit: { windowMs: 60 * 60 * 1000, maxAttempts: 10 } as RateLimitConfig,
  documentUpload: { windowMs: 60 * 1000, maxAttempts: 20 } as RateLimitConfig,
  statusLookup: { windowMs: 60 * 1000, maxAttempts: 15 } as RateLimitConfig,
  categoryRead: { windowMs: 60 * 1000, maxAttempts: 60 } as RateLimitConfig,
  otpRequest: { windowMs: 60 * 60 * 1000, maxAttempts: 5 } as RateLimitConfig,
  otpVerify: { windowMs: 15 * 60 * 1000, maxAttempts: 10 } as RateLimitConfig
} as const

export function isRateLimited(bucketName: string, identity: string, config: RateLimitConfig): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return false
  }

  const key = `${bucketName}:${identity}`
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now - entry.windowStart > config.windowMs) {
    buckets.set(key, { count: 1, windowStart: now })

    return false
  }

  entry.count += 1

  return entry.count > config.maxAttempts
}
