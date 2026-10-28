import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

// All nullable/optional since any of these can legitimately be blank (e.g.
// a category with no separate allotment-amount note, or Hindi fields not
// yet filled in). name/name_hi are the only two that must stay non-empty —
// every other admin/public view assumes a category always has a display
// name.
const updateCategoryContentSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(191),
  nameHi: z.string().trim().min(1).max(191),
  description: z.string().trim().max(5000).nullable(),
  descriptionHi: z.string().trim().max(5000).nullable(),
  allotmentAmountNote: z.string().trim().max(5000).nullable(),
  allotmentAmountNoteHi: z.string().trim().max(5000).nullable(),
  importantDatesNote: z.string().trim().max(5000).nullable(),
  importantDatesNoteHi: z.string().trim().max(5000).nullable(),
  showOnHomepage: z.boolean()
})

/**
 * Admin API: update a single category's display/content fields — name,
 * description, allotment-amount note (English/Hindi), and whether it shows
 * as a homepage card. Separate from /api/admin/categories/fee (numeric fee
 * config only) since this is text content, not pricing.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = updateCategoryContentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid category content.' }, { status: 400 })
    }

    const {
      categoryId,
      name,
      nameHi,
      description,
      descriptionHi,
      allotmentAmountNote,
      allotmentAmountNoteHi,
      importantDatesNote,
      importantDatesNoteHi,
      showOnHomepage
    } = parsed.data

    await query(
      `UPDATE categories
       SET name = ?, name_hi = ?, description = ?, description_hi = ?,
           allotment_amount_note = ?, allotment_amount_note_hi = ?,
           important_dates_note = ?, important_dates_note_hi = ?, show_on_homepage = ?
       WHERE id = ?`,
      [
        name,
        nameHi,
        description || null,
        descriptionHi || null,
        allotmentAmountNote || null,
        allotmentAmountNoteHi || null,
        importantDatesNote || null,
        importantDatesNoteHi || null,
        showOnHomepage ? 1 : 0,
        categoryId
      ]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'category.content_updated',
      module: 'settings',
      entityType: 'category',
      entityId: String(categoryId),
      newValue: {
        name,
        nameHi,
        description,
        descriptionHi,
        allotmentAmountNote,
        allotmentAmountNoteHi,
        importantDatesNote,
        importantDatesNoteHi,
        showOnHomepage
      }
    })

    return NextResponse.json({ success: true, message: `Content for "${name}" updated successfully.` })
  } catch (error) {
    logServerError('api.admin.categories.content', error)

    return NextResponse.json({ error: 'Failed to update category content.' }, { status: 500 })
  }
}
