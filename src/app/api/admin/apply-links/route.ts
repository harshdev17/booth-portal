import { NextResponse } from 'next/server'
import { z } from 'zod'

import { generateBypassToken, hashBypassToken } from '@/lib/applications/bypass-link'
import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const createSchema = z.object({
  categoryId: z.number().int().positive(),
  expiresAt: z.string().trim().min(1).max(32).nullable().optional()
})

// Unlimited uses by design, per explicit request (2026-11-25): "max user
// waala kuch ni chahiye, jitne user ke pass hai sab bhar sakte hai" — anyone
// holding the link can submit as many times as needed. application_bypass_links.max_uses
// stays NOT NULL (migration 0094), so this sentinel stands in for
// "no real limit" rather than reworking that column.
const UNLIMITED_USES = 1_000_000

/**
 * Admin: generate a per-recipient "apply anyway" link for a category that is
 * closed to the public (migration 0094) — per explicit request (2026-11-25).
 * Both the token and its hash are stored (migration 0095, per explicit
 * follow-up request) so the Generated Links list can offer "Copy" on every
 * row, not just right after creation — this is an admin-only
 * (config:manage) page, same exposure as whoever generated it in the first
 * place.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const categoryRows = await query<Array<{ id: number; name: string; slug: string }>>(
      `SELECT id, name, slug FROM categories WHERE id = ? LIMIT 1`,
      [parsed.data.categoryId]
    )

    const category = categoryRows[0]

    if (!category) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }

    const token = generateBypassToken()
    const tokenHash = hashBypassToken(token)

    const result = await query<{ insertId: number }>(
      `INSERT INTO application_bypass_links
         (token_hash, token, category_id, max_uses, expires_at, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tokenHash, token, parsed.data.categoryId, UNLIMITED_USES, parsed.data.expiresAt ?? null, session.userId]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'application_bypass_link.created',
      module: 'applications',
      entityType: 'application_bypass_link',
      entityId: String(result.insertId),
      newValue: {
        categoryId: parsed.data.categoryId,
        categoryName: category.name,
        expiresAt: parsed.data.expiresAt ?? null
      }
    })

    // The client builds the full URL itself from window.location.origin
    // (see ApplyLinksClient.tsx's buildUrl) rather than trusting
    // NEXT_PUBLIC_APP_URL here, which is frequently left at a dev/placeholder
    // value in .env — this stays correct from whatever host the admin is
    // actually viewing the portal from.
    return NextResponse.json({
      success: true,
      id: result.insertId,
      token,
      categorySlug: category.slug
    })
  } catch (error) {
    logServerError('api.admin.apply-links.create', error)

    return NextResponse.json({ error: 'Failed to create link.' }, { status: 500 })
  }
}
