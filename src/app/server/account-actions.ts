'use server'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { query } from '@/lib/db/client'

export type ChangePasswordState = {
  error?: string
  success?: string
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password')
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match.',
    path: ['confirmPassword']
  })

/**
 * Self-service password change for the logged-in admin — the only account
 * action "My Account" currently offers. Requires re-entering the current
 * password (never trusts that an active session alone is enough to change
 * the credential that protects it) and is audit-logged like every other
 * security-relevant admin action.
 */
export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }

  const session = await getSession()

  if (!session) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  const rows = await query<Array<{ password_hash: string }>>('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [
    session.userId
  ])

  const user = rows[0]

  if (!user) {
    return { error: 'Account not found.' }
  }

  const currentValid = await verifyPassword(parsed.data.currentPassword, user.password_hash)

  if (!currentValid) {
    return { error: 'Current password is incorrect.' }
  }

  const newHash = await hashPassword(parsed.data.newPassword)

  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, session.userId])

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'auth.password_changed',
    module: 'auth',
    entityType: 'user',
    entityId: String(session.userId)
  })

  return { success: 'Password updated successfully.' }
}
