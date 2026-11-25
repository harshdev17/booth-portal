import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { query } from '@/lib/db/client'

/**
 * Admin-generated "apply anyway" links (migration 0094) — per explicit
 * request (2026-11-25): a category can be closed to the public while an
 * admin still wants one specific applicant to be able to submit. Reuses the
 * same hash-only-storage principle as access-token.ts (a DB leak alone never
 * reveals a usable token).
 */
export function generateBypassToken(): string {
  return randomBytes(24).toString('base64url')
}

export function hashBypassToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type BypassLinkCheck =
  | { ok: true; linkId: number }
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' | 'exhausted' }

/**
 * Verifies a token against application_bypass_links WITHOUT consuming it —
 * used at apply-page render time (just needs to know whether to show the
 * form instead of "Applications Closed") and again, independently, right
 * before actually creating the draft (see consumeBypassToken) since render
 * and submit are separate requests and the link must not be usable twice
 * just because it rendered successfully once.
 */
export async function checkBypassToken(token: string, categorySlug: string): Promise<BypassLinkCheck> {
  const tokenHash = hashBypassToken(token)

  const rows = await query<
    Array<{ id: number; max_uses: number; use_count: number; expires_at: string | null; revoked_at: string | null }>
  >(
    `SELECT bl.id, bl.max_uses, bl.use_count, bl.expires_at, bl.revoked_at
     FROM application_bypass_links bl
     JOIN categories c ON c.id = bl.category_id
     WHERE bl.token_hash = ? AND c.slug = ?
     LIMIT 1`,
    [tokenHash, categorySlug]
  )

  const link = rows[0]

  if (!link) return { ok: false, reason: 'not_found' }
  if (link.revoked_at) return { ok: false, reason: 'revoked' }
  if (link.expires_at && new Date(link.expires_at) < new Date()) return { ok: false, reason: 'expired' }
  if (link.use_count >= link.max_uses) return { ok: false, reason: 'exhausted' }

  return { ok: true, linkId: link.id }
}

/**
 * Atomically increments use_count, guarded by the same conditions as
 * checkBypassToken (WHERE clause re-checks revoked/expiry/exhaustion at the
 * DB level) so two near-simultaneous submissions against a max_uses=1 link
 * can't both slip through a race between check and increment.
 */
export async function consumeBypassToken(linkId: number): Promise<boolean> {
  const result = await query<{ affectedRows: number }>(
    `UPDATE application_bypass_links
     SET use_count = use_count + 1, last_used_at = NOW()
     WHERE id = ? AND revoked_at IS NULL AND use_count < max_uses
       AND (expires_at IS NULL OR expires_at >= NOW())`,
    [linkId]
  )

  return result.affectedRows > 0
}
