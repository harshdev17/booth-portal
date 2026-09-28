import 'server-only'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db/client'
import type { Permission } from '@/lib/rbac/permissions'

export class AuthenticationError extends Error {
  constructor() {
    super('Not authenticated')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(permission: string) {
    super(`Missing required permission: ${permission}`)
    this.name = 'AuthorizationError'
  }
}

// Short TTL cache (30s) for role permissions to eliminate redundant DB round trips
// across layout checks and page-level permission checks.
const rolePermissionsCache = new Map<string, { permissions: Set<string>; cachedAt: number }>()
const ROLE_CACHE_TTL_MS = 30_000

async function getRolePermissions(roleKey: string): Promise<Set<string>> {
  const cached = rolePermissionsCache.get(roleKey)
  const now = Date.now()

  if (cached && now - cached.cachedAt < ROLE_CACHE_TTL_MS) {
    return cached.permissions
  }

  const rows = await query<Array<{ key: string }>>(
    `SELECT p.\`key\` AS \`key\`
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     JOIN roles r ON r.id = rp.role_id
     WHERE r.\`key\` = ?`,
    [roleKey]
  )

  const permissions = new Set(rows.map(r => r.key))

  rolePermissionsCache.set(roleKey, { permissions, cachedAt: now })

  return permissions
}

/**
 * Server-side authorization gate. Every mutating/sensitive server action or
 * API route handler must call this (or requireAnyPermission) BEFORE touching
 * data — the UI hiding a button is never sufficient (see CLAUDE.md Section 15).
 *
 * Throws AuthenticationError if there's no valid session, or
 * AuthorizationError if the session's role lacks the permission. Callers
 * should let these propagate to a route-level error boundary / API error
 * handler that maps them to 401/403 without leaking internals.
 */
export async function requirePermission(permission: Permission) {
  const session = await getSession()

  if (!session) throw new AuthenticationError()

  const permissions = await getRolePermissions(session.role.key)

  if (!permissions.has(permission)) throw new AuthorizationError(permission)

  return session
}

export async function requireAnyPermission(permissions: Permission[]) {
  const session = await getSession()

  if (!session) throw new AuthenticationError()

  const granted = await getRolePermissions(session.role.key)
  const hasAny = permissions.some(p => granted.has(p))

  if (!hasAny) throw new AuthorizationError(permissions.join(' or '))

  return session
}

/** For UI-only decisions (show/hide). Never a substitute for requirePermission on the server action itself. */
export async function getCurrentUserPermissions(): Promise<Set<string> | null> {
  const session = await getSession()

  if (!session) return null

  return getRolePermissions(session.role.key)
}
