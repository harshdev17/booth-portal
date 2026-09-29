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
// ("2026-10-01T00:00", no timezone/offset). Per the HTML spec this has no
// intrinsic timezone — `new Date(value)` therefore parses it using
// whatever timezone the RUNNING PROCESS happens to be in, which varies
// between a developer's local machine (e.g. IST) and a deployed server
// (commonly UTC). The same input previously produced different stored
// UTC instants depending on which process handled the request — a real
// bug that silently shifted application open/close times by up to 5.5
// hours and could make a category show "Applications Closed" or "Open"
// incorrectly. Since this portal is India-only, the value is always
// interpreted as IST (UTC+5:30) explicitly here, never the ambient
// process timezone.
const IST_OFFSET_MINUTES = 5 * 60 + 30

function parseIstDatetimeLocal(value: string): Date {
  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  // Date.UTC gives the instant that is this wall-clock time in UTC; since
  // the input is actually IST wall-clock time, subtract the IST offset to
  // get the true UTC instant.
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60 * 1000)
}

const nullableDateTime = z
  .string()
  .trim()
  .refine(value => value === '' || !Number.isNaN(Date.parse(value)), 'Invalid date/time')
  .nullable()
  .transform(value => (value ? parseIstDatetimeLocal(value).toISOString().slice(0, 19).replace('T', ' ') : null))

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
