import type { Metadata } from 'next'

import { ShieldCheckIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import PermissionToggle from '@/views/admin/roles/PermissionToggle'

export const metadata: Metadata = {
  title: 'User Roles & Permissions — KDB Admin Portal'
}

type RoleRow = { id: number; key: string; name: string; description: string | null; is_system: number }
type PermissionRow = { id: number; key: string; description: string | null }
type GrantRow = { role_id: number; permission_id: number }
type UserRow = { id: number; full_name: string; email: string; status: string; role_name: string; last_login_at: string | null }

/**
 * Role x Permission matrix per .ai/RBAC.md — Super Admin only (role:manage),
 * per .ai/ADMIN_PANEL.md Section 10. Every toggle is independently
 * re-authorized and audit-logged server-side (src/app/server/role-actions.ts);
 * this page only controls what's rendered.
 */
const RolesAdminPage = async () => {
  await requirePermission('role:manage')

  const [roles, permissions, grants, users, viewerPermissions] = await Promise.all([
    query<RoleRow[]>('SELECT id, `key`, name, description, is_system FROM roles ORDER BY id ASC'),
    query<PermissionRow[]>('SELECT id, `key`, description FROM permissions ORDER BY `key` ASC'),
    query<GrantRow[]>('SELECT role_id, permission_id FROM role_permissions'),
    query<UserRow[]>(
      `SELECT u.id, u.full_name, u.email, u.status, r.name AS role_name, u.last_login_at
       FROM users u JOIN roles r ON r.id = u.role_id
       ORDER BY u.full_name ASC`
    ),
    getCurrentUserPermissions()
  ])

  const canManage = !!viewerPermissions?.has('role:manage')
  const grantSet = new Set(grants.map(g => `${g.role_id}:${g.permission_id}`))

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>User Roles & Permissions</h1>
        <p className='text-sm text-muted-foreground'>
          Manage what each role can do. Super Admin has every permission by design and cannot be edited here.
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Permission Matrix</CardTitle>
          <CardDescription className='text-xs'>{roles.length} roles · {permissions.length} permissions</CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto p-0'>
          <table className='w-full text-left text-sm'>
            <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
              <tr>
                <th className='sticky left-0 bg-muted/20 py-3 px-4'>Permission</th>
                {roles.map(role => (
                  <th key={role.id} className='py-3 px-4 text-center whitespace-nowrap'>
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y'>
              {permissions.map(permission => (
                <tr key={permission.id} className='hover:bg-muted/30 transition'>
                  <td className='sticky left-0 bg-white py-2.5 px-4'>
                    <p className='font-mono text-xs font-bold text-[#0c2847]'>{permission.key}</p>
                    <p className='text-xs text-muted-foreground'>{permission.description}</p>
                  </td>
                  {roles.map(role => {
                    const granted = grantSet.has(`${role.id}:${permission.id}`)
                    const isSuperAdmin = role.key === 'super_admin'

                    return (
                      <td key={role.id} className='py-2.5 px-4 text-center'>
                        <PermissionToggle
                          roleId={role.id}
                          permissionId={permission.id}
                          granted={granted}
                          disabled={!canManage || isSuperAdmin}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Admin Users</CardTitle>
          <CardDescription className='text-xs'>
            {users.length} account(s). Creating/deactivating admin users is not built yet — see Notes below.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {users.length === 0 ? (
            <div className='py-12 text-center'>
              <ShieldCheckIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No admin users found.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
                  <tr>
                    <th className='py-3 px-4'>Name</th>
                    <th className='py-3 px-4'>Email</th>
                    <th className='py-3 px-4'>Role</th>
                    <th className='py-3 px-4'>Status</th>
                    <th className='py-3 px-4'>Last Login</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {users.map(user => (
                    <tr key={user.id} className='hover:bg-muted/30 transition'>
                      <td className='py-3 px-4 font-semibold text-[#0c2847]'>{user.full_name}</td>
                      <td className='py-3 px-4 text-xs text-muted-foreground'>{user.email}</td>
                      <td className='py-3 px-4'>{user.role_name}</td>
                      <td className='py-3 px-4'>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className='py-3 px-4 text-xs text-muted-foreground'>
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-IN') : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RolesAdminPage
