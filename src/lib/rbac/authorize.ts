import 'server-only'

import { cache } from 'react'

import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db/client'
import type { Permission } from '@/lib/rbac/permissions'

// Prefix kept on `message` (not just `name`) because Next.js only passes
// `message` through to the client-side error boundary for errors it renders
// (vs. redacting to a generic message for ones it just logs) — see
// src/app/(admin)/error.tsx, which pattern-matches this prefix to show
// "Access Denied" instead of its default auto-retrying "server busy" screen.
const PERMISSION_ERROR_PREFIX = 'PERMISSION_DENIED:'

export class AuthenticationError extends Error {
  constructor() {
    super(`${PERMISSION_ERROR_PREFIX} Not authenticated`)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(permission: string) {
    super(`${PERMISSION_ERROR_PREFIX} Missing required permission: ${permission}`)
    this.name = 'AuthorizationError'
  }
}

// Kept at the original 30s per explicit instruction — the real fix for DB
// overload under this short TTL is the error-fallback below (serve the
// last-known-good permission set on a DB hiccup instead of throwing), not a
// longer TTL (see .ai/CHANGELOG.md 2026-11-14).
const rolePermissionsCache = new Map<string, { permissions: Set<string>; cachedAt: number }>()
const ROLE_CACHE_TTL_MS = 30_000

async function getRolePermissions(roleKey: string): Promise<Set<string>> {
  const cached = rolePermissionsCache.get(roleKey)
  const now = Date.now()

  if (cached && now - cached.cachedAt < ROLE_CACHE_TTL_MS) {
    return cached.permissions
  }

  let rows: Array<{ key: string }>

  try {
    rows = await query(
      `SELECT p.\`key\` AS \`key\`
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.\`key\` = ?`,
      [roleKey]
    )
  } catch (error) {
    // DB unreachable/busy — serve the last-known-good permission set rather
    // than throwing (which previously surfaced as a false "you don't have
    // access" screen under DB load, not an actual permission problem).
    if (cached) return cached.permissions
    throw error
  }

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
export const getCurrentUserPermissions = cache(async function getCurrentUserPermissions(): Promise<Set<string> | null> {
  const session = await getSession()

  if (!session) return null

  return getRolePermissions(session.role.key)
})
