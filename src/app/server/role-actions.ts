'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

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
