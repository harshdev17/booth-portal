import 'server-only'

import { randomBytes } from 'node:crypto'

import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'

import { query } from '@/lib/db/client'

const SESSION_COOKIE_NAME = 'kdb_admin_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 8 // 8 hours idle-session ceiling — see .ai/OPEN_QUESTIONS.md #8 for final confirmation
const sessionTouchCache = new Map<string, number>()

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to a random string of at least 32 characters. Never hardcode this — see .env.example.'
    )
  }

  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  sessionId: string
  userId: number
}

/**
 * Creates a server-side session row (revocable) and issues a signed, httpOnly,
 * secure session cookie referencing it. The JWT signature prevents tampering;
 * the DB row lets us revoke a session immediately (logout, account disable)
 * without waiting for token expiry.
 */
export async function createSession(userId: number, meta: { ipAddress?: string; userAgent?: string }) {
  const sessionId = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)

  await query(
    `INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, userId, meta.ipAddress ?? null, meta.userAgent ?? null, expiresAt]
  )

  const token = await new SignJWT({ sessionId, userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSessionSecret())

  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  })

  return { sessionId, expiresAt }
}

/**
 * Verifies the session cookie's signature/expiry AND that the referenced
 * session row is still active (not revoked, not past its DB-side expiry).
 * Returns null on any failure — callers must treat null as "not authenticated".
 */
export async function getSession(): Promise<
  (SessionPayload & { role: { key: string; name: string }; email: string; fullName: string }) | null
> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) return null

  let payload: SessionPayload

  try {
    const verified = await jwtVerify(token, getSessionSecret())

    payload = verified.payload as unknown as SessionPayload
  } catch {
    return null
  }

  const rows = await query<
    Array<{
      user_id: number
      status: 'active' | 'disabled'
      email: string
      full_name: string
      role_key: string
      role_name: string
    }>
  >(
    `SELECT s.user_id, u.status, u.email, u.full_name, r.\`key\` AS role_key, r.name AS role_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE s.id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
    [payload.sessionId]
  )

  const row = rows[0]

  if (!row || row.status !== 'active') return null

  // Touch last_seen_at for session activity visibility; throttled to avoid hitting remote DB on every page request
  const now = Date.now()
  const lastTouch = sessionTouchCache.get(payload.sessionId) ?? 0

  if (now - lastTouch > 120_000) {
    sessionTouchCache.set(payload.sessionId, now)
    void query('UPDATE sessions SET last_seen_at = NOW() WHERE id = ?', [payload.sessionId]).catch(() => {})
  }

  return {
    sessionId: payload.sessionId,
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: { key: row.role_key, name: row.role_name }
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    try {
      const verified = await jwtVerify(token, getSessionSecret())
      const payload = verified.payload as unknown as SessionPayload

      await query('UPDATE sessions SET revoked_at = NOW() WHERE id = ?', [payload.sessionId])
    } catch {
      // Token already invalid/expired — nothing to revoke server-side.
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}

export const SESSION_COOKIE = SESSION_COOKIE_NAME
