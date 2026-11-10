'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { hashPassword } from '@/lib/auth/password'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

export type RoleActionState = {
  error?: string
  success?: string
}

const toggleSchema = z.object({
  roleId: z.coerce.number().int().positive(),
  permissionId: z.coerce.number().int().positive(),
  grant: z.enum(['true', 'false'])
})

/**
 * Grants or revokes a single permission for a role. Super Admin's own
 * permission set is never editable from here — it is the system's ultimate
 * role (is_system=1) and every permission is seeded to it by design
 * (0002_seed_roles_and_permissions.sql); allowing edits risks a self-lockout
 * with no other role able to restore it.
 */
export async function toggleRolePermissionAction(
  _prevState: RoleActionState,
  formData: FormData
): Promise<RoleActionState> {
  const parsed = toggleSchema.safeParse({
    roleId: formData.get('roleId'),
    permissionId: formData.get('permissionId'),
    grant: formData.get('grant')
  })

  if (!parsed.success) {
    return { error: 'Invalid request.' }
  }

  const session = await requirePermission('role:manage')

  const roleRows = await query<Array<{ key: string; name: string }>>('SELECT `key`, name FROM roles WHERE id = ?', [
    parsed.data.roleId
  ])

  const role = roleRows[0]

  if (!role) return { error: 'Role not found.' }

  if (role.key === 'super_admin') {
    return { error: "Super Admin's permissions cannot be changed here." }
  }

  const permRows = await query<Array<{ key: string }>>('SELECT `key` FROM permissions WHERE id = ?', [
    parsed.data.permissionId
  ])

  const permission = permRows[0]

  if (!permission) return { error: 'Permission not found.' }

  const grant = parsed.data.grant === 'true'

  if (grant) {
    await query(
      'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [parsed.data.roleId, parsed.data.permissionId]
    )
  } else {
    await query('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?', [
      parsed.data.roleId,
      parsed.data.permissionId
    ])
  }

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: grant ? 'role.permission_granted' : 'role.permission_revoked',
    module: 'rbac',
    entityType: 'role',
    entityId: String(parsed.data.roleId),
    newValue: { role: role.key, permission: permission.key, granted: grant }
  })

  revalidatePath('/admin/roles')

  return { success: `${permission.key} ${grant ? 'granted to' : 'revoked from'} ${role.name}.` }
}

const createUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.').max(191),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(191),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  permissionIds: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one permission.')
})

function slugifyRoleKey(fullName: string): string {
  return (
    fullName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'staff'
  )
}

/**
 * Creates a new staff/admin login — per explicit request, added directly to
 * this page (Admin Users list) rather than as its own sidebar entry, since
 * there was previously no way to create one at all: every existing admin
 * account had been inserted straight into the database by hand. Gated by
 * the same role:manage permission as the rest of this page. The new user's
 * password is hashed the same way the login flow verifies it
 * (bcrypt, src/lib/auth/password.ts) — never stored or logged in plaintext.
 *
 * No role dropdown — per explicit request ("role mat rakh na, seedha access
 * decide hoga"), the admin picks exactly which permissions this one person
 * gets, not an existing shared role. Since `users.role_id` is a required
 * foreign key (every user must belong to SOME role — that's the schema this
 * app's whole authorization system is built on; there is no per-user
 * permission table), a new one-person role is created behind the scenes
 * with exactly the checked permissions and the new user is assigned to it.
 * That role still shows up on the Permission Matrix above afterward (it's
 * not hidden/special), named after this person, so it stays visible/
 * adjustable later rather than being an invisible one-off.
 */
export async function createStaffUserAction(
  _prevState: RoleActionState,
  formData: FormData
): Promise<RoleActionState> {
  const parsed = createUserSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    permissionIds: formData.getAll('permissionIds')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  }

  const session = await requirePermission('role:manage')

  const existing = await query<Array<{ id: number }>>('SELECT id FROM users WHERE email = ?', [parsed.data.email])

  if (existing.length > 0) {
    return { error: 'A user with this email already exists.' }
  }

  const permRows = await query<Array<{ id: number; key: string }>>(
    `SELECT id, \`key\` FROM permissions WHERE id IN (${parsed.data.permissionIds.map(() => '?').join(', ')})`,
    parsed.data.permissionIds
  )

  if (permRows.length !== parsed.data.permissionIds.length) {
    return { error: 'One or more selected permissions are invalid.' }
  }

  // Role key must be unique — append a numeric suffix on collision (two
  // staff members with the same name, or re-creating after a rename).
  const baseKey = slugifyRoleKey(parsed.data.fullName)
  let roleKey = baseKey
  let suffix = 2

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await query<Array<{ id: number }>>('SELECT id FROM roles WHERE `key` = ?', [roleKey])

    if (clash.length === 0) break

    roleKey = `${baseKey}_${suffix}`
    suffix += 1
  }

  const roleResult = await query<{ insertId: number }>(
    `INSERT INTO roles (\`key\`, name, description, is_system) VALUES (?, ?, ?, 0)`,
    [roleKey, parsed.data.fullName, `Individual access for ${parsed.data.fullName}`]
  )

  const roleId = roleResult.insertId

  if (permRows.length > 0) {
    const values = permRows.map(p => [roleId, p.id])

    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values.map(() => '(?, ?)').join(', ')}`,
      values.flat()
    )
  }

  const passwordHash = await hashPassword(parsed.data.password)

  // must_change_password is left at its default (0) — that flag exists in
  // the schema but nothing in the login flow currently enforces it, so
  // setting it here would silently promise a "forced password change on
  // first login" prompt that doesn't exist.
  const userResult = await query<{ insertId: number }>(
    `INSERT INTO users (full_name, email, password_hash, role_id, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [parsed.data.fullName, parsed.data.email, passwordHash, roleId]
  )

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'user.created',
    module: 'rbac',
    entityType: 'user',
    entityId: String(userResult.insertId),
    newValue: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      role: roleKey,
      permissions: permRows.map(p => p.key)
    }
  })

  revalidatePath('/admin/roles')

  return { success: `Staff account created for ${parsed.data.fullName} with ${permRows.length} permission(s).` }
}
