import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

// Interim applicant-ownership mechanism (no OTP yet — see .ai/DECISIONS.md).
// A random, unguessable token is generated at submission and shown to the
// applicant exactly once (confirmation page / their own printout). Only a
// SHA-256 hash of the token is ever stored — same principle as a password —
// so a database leak alone does not grant access to any application.

export function generateAccessToken(): string {
  // 32 bytes of entropy, base64url-encoded: URL-safe, no padding characters.
  return randomBytes(32).toString('base64url')
}

export function hashAccessToken(token: string): string {
  const secret = process.env.APPLICATION_ACCESS_TOKEN_SECRET

  if (!secret) {
    throw new Error('APPLICATION_ACCESS_TOKEN_SECRET must be set.')
  }

  return createHash('sha256').update(`${secret}:${token}`).digest('hex')
}

/** Constant-time comparison — never use `===` on hashes derived from user input. */
export function verifyAccessToken(token: string, storedHash: string): boolean {
  const candidateHash = hashAccessToken(token)
  const a = Buffer.from(candidateHash, 'hex')
  const b = Buffer.from(storedHash, 'hex')

  if (a.length !== b.length) return false

  return timingSafeEqual(a, b)
}
