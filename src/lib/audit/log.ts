import 'server-only'

import { query } from '@/lib/db/client'

export type AuditEntry = {
  actorUserId: number | null
  actorRoleKey: string | null
  action: string
  module: string
  entityType?: string | null
  entityId?: string | null
  previousValue?: unknown
  newValue?: unknown
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Appends one audit log row. This table is append-only by convention — no
 * update/delete helper is exposed anywhere in the codebase (see
 * .ai/AUDIT_LOGS.md Section 4). IP/user-agent are only meaningfully populated
 * once IP logging is approved (.ai/OPEN_QUESTIONS.md #11); passing them is
 * harmless either way since the column accepts NULL.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  await query(
    `INSERT INTO audit_logs
       (actor_user_id, actor_role_key, action, module, entity_type, entity_id, previous_value, new_value, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorUserId,
      entry.actorRoleKey,
      entry.action,
      entry.module,
      entry.entityType ?? null,
      entry.entityId ?? null,
      entry.previousValue ? JSON.stringify(entry.previousValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
      entry.ipAddress ?? null,
      entry.userAgent ?? null
    ]
  )
}
