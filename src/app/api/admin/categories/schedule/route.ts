import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

// Empty string from a date/text input means "clear this field" (NULL), not
// an invalid value — distinct from omitting the key entirely.
//
// The admin UI sends a bare <input type="datetime-local"> value
// ("2026-10-22T00:00", no timezone/offset) — this is already the IST
// wall-clock time the admin intends, with no conversion needed. Every
// pooled DB connection runs `SET time_zone = '+05:30'` (see
// src/lib/db/client.ts), so MySQL's own NOW() also returns IST wall-clock
// time, and this column is compared directly against NOW() elsewhere
// (isCategoryAcceptingApplications() / lib/applications/categories.ts).
// Storing anything other than the IST wall-clock value here — e.g. a
// previous version of this file converted the input to a UTC instant
// before storing it — creates a silent ~5.5 hour mismatch against that
// IST-returning NOW(): a category set to open at midnight IST showed as
// already open 5.5 hours early, confirmed live against the UAT database.
const nullableDateTime = z
  .string()
  .trim()
  .refine(value => value === '' || !Number.isNaN(Date.parse(value)), 'Invalid date/time')
  .nullable()
  .transform(value => (value ? `${value.replace('T', ' ')}:00` : null))

const nullableText = z
  .string()
  .trim()
  .max(255)
  .nullable()
  .transform(value => (value ? value : null))

const scheduleFieldsSchema = z.object({
  applicationOpensAt: nullableDateTime,
  applicationClosesAt: nullableDateTime,
  auctionDate: nullableDateTime,
  auctionVenue: nullableText,
  auctionVenueHi: nullableText
})

const updateScheduleSchema = scheduleFieldsSchema.extend({
  categoryId: z.number().int().positive().optional(),

  // When provided (and non-empty), the same schedule is applied to every
  // listed category in one request — for events where multiple/all
  // categories genuinely share one open/close date and auction slot,
  // so an admin doesn't have to repeat identical values per category.
  categoryIds: z.array(z.number().int().positive()).optional()
})

/**
 * Admin API: update one or more categories' application open/close dates
 * and auction date/venue — the values shown to applicants on the apply
 * page's "Before You Start" instructions (see InstructionsStep.tsx and
 * migration 0009_category_auction_details.sql). Per CLAUDE.md Section 5,
 * these are exactly the kind of event-specific business values that must
 * be configurable, never hardcoded.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json()
    const parsed = updateScheduleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid schedule configuration parameters.' }, { status: 400 })
    }

    const { applicationOpensAt, applicationClosesAt, auctionDate, auctionVenue, auctionVenueHi } = parsed.data
    const targetIds = parsed.data.categoryIds?.length ? parsed.data.categoryIds : parsed.data.categoryId ? [parsed.data.categoryId] : []

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No category specified.' }, { status: 400 })
    }

    await query(
      `UPDATE categories
       SET application_opens_at = ?,
           application_closes_at = ?,
           auction_date = ?,
           auction_venue = ?,
           auction_venue_hi = ?
       WHERE id IN (${targetIds.map(() => '?').join(',')})`,
      [applicationOpensAt, applicationClosesAt, auctionDate, auctionVenue, auctionVenueHi, ...targetIds]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: targetIds.length > 1 ? 'category.schedule_bulk_updated' : 'category.schedule_updated',
      module: 'settings',
      entityType: 'category',
      entityId: targetIds.join(','),
      newValue: { applicationOpensAt, applicationClosesAt, auctionDate, auctionVenue, auctionVenueHi, categoryIds: targetIds }
    })

    return NextResponse.json({
      success: true,
      message: targetIds.length > 1 ? `Schedule applied to ${targetIds.length} categories.` : 'Schedule updated successfully.'
    })
  } catch (error) {
    logServerError('api.admin.categories.schedule', error)

    return NextResponse.json({ error: 'Failed to update schedule configuration.' }, { status: 500 })
  }
}
