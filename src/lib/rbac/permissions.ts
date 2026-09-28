/**
 * Permission catalogue — must stay in sync with .ai/RBAC.md Section 2 and
 * the `permissions` table (src/database/migrations/0002_seed_roles_and_permissions.sql).
 * This is a compile-time-checked list so a typo in a `permission` prop
 * anywhere in the app (e.g. navConfig.tsx) fails to type-check rather than
 * silently granting/denying nothing at runtime.
 */
export const PERMISSIONS = [
  'application:view',
  'application:approve',
  'application:reject',
  'application:cancel',
  'document:view',
  'document:verify',
  'payment:view',
  'payment:reconcile',
  'payment:refund',
  'payment:activate_paynow',
  'inventory:view',
  'inventory:manage',
  'draw:run',
  'draw:view',
  'allotment:perform',
  'allotment:reallot',
  'qr:decode',
  'qr:revoke',
  'report:view',
  'report:export',
  'config:manage',
  'user:manage',
  'role:manage',
  'audit:view'
] as const

export type Permission = (typeof PERMISSIONS)[number]
