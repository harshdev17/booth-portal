import 'server-only'

import { query } from '@/lib/db/client'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { logAudit } from '@/lib/audit/log'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export type LoginResult =
  | { ok: true }
  | { ok: false; error: 'invalid_credentials' | 'account_disabled' | 'account_locked' }

type UserRow = {
  id: number
  email: string
  password_hash: string
  status: 'active' | 'disabled'
  failed_login_count: number
  locked_until: string | null
}

/**
 * Authenticates an admin/staff user by email + password.
 *
 * Security properties:
 * - Returns a generic 'invalid_credentials' error whether the email doesn't
 *   exist or the password is wrong — never reveals which, to avoid user
 *   enumeration.
 * - Applies a lockout after MAX_FAILED_ATTEMPTS consecutive failures.
 * - Every attempt (success or failure) is audit-logged per .ai/AUDIT_LOGS.md.
 * - Caller is responsible for applying request-level rate limiting
 *   (see src/lib/auth/rate-limit.ts) before calling this.
 */
export async function login(
  email: string,
  plainTextPassword: string,
  meta: { ipAddress?: string; userAgent?: string }
): Promise<LoginResult> {
  const rows = await query<UserRow[]>(
    `SELECT id, email, password_hash, status, failed_login_count, locked_until
     FROM users WHERE email = ? LIMIT 1`,
    [email.trim().toLowerCase()]
  )

  const user = rows[0]

  if (!user) {
    // Still hash something to keep response timing roughly consistent with the
    // "user exists" path, reducing (not eliminating) user-enumeration via timing.
    await verifyPassword(plainTextPassword, '$2a$12$invalidsaltinvalidsaltinvalidsalOu')
    await logAudit({
      actorUserId: null,
      actorRoleKey: null,
      action: 'auth.login.failed',
      module: 'auth',
      entityType: 'user',
      entityId: email,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    })

    return { ok: false, error: 'invalid_credentials' }
  }

  if (user.status === 'disabled') {
    await logAudit({
      actorUserId: user.id,
      actorRoleKey: null,
      action: 'auth.login.failed_disabled',
      module: 'auth',
      entityType: 'user',
      entityId: String(user.id),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    })

    return { ok: false, error: 'account_disabled' }
  }

  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    await logAudit({
      actorUserId: user.id,
      actorRoleKey: null,
      action: 'auth.login.failed_locked',
      module: 'auth',
      entityType: 'user',
      entityId: String(user.id),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    })

    return { ok: false, error: 'account_locked' }
  }

  const passwordValid = await verifyPassword(plainTextPassword, user.password_hash)

  if (!passwordValid) {
    const nextCount = user.failed_login_count + 1
    const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS

    await query(
      `UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?`,
      [
        shouldLock ? 0 : nextCount,
        shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
        user.id
      ]
    )

    await logAudit({
      actorUserId: user.id,
      actorRoleKey: null,
      action: shouldLock ? 'auth.login.locked' : 'auth.login.failed',
      module: 'auth',
      entityType: 'user',
      entityId: String(user.id),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    })

    return { ok: false, error: shouldLock ? 'account_locked' : 'invalid_credentials' }
  }

  // Successful login: reset lockout counters, record last login, create session.
  await query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
    [user.id]
  )

  await createSession(user.id, meta)

  await logAudit({
    actorUserId: user.id,
    actorRoleKey: null,
    action: 'auth.login.success',
    module: 'auth',
    entityType: 'user',
    entityId: String(user.id),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  })

  return { ok: true }
}
