import { NextResponse } from 'next/server'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'

type TimelineEvent = {
  id: string
  timestamp: string
  action: string
  title: string
  description: string
  actorName?: string | null
  badgeColor: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('inventory:view')
    const { id } = await params
    const shopUnitId = decodeId(id)

    if (!shopUnitId) {
      return NextResponse.json({ error: 'Invalid booth/stall unit ID.' }, { status: 400 })
    }

    // Run all data lookups concurrently in a single Promise.all on indexed fields
    const [units, directAllotments, drawAllotments, auditLogs, notifications] = await Promise.all([
      query<
        Array<{
          id: number
          stall_number: string
          shop_type: string
          direction: string | null
          emd_amount_paise: number | null
          status: string
          category_name: string
          created_at: string
        }>
      >(
        `SELECT su.id, su.stall_number, su.shop_type, su.direction, su.emd_amount_paise,
                su.status, c.name AS category_name, su.created_at
         FROM shop_units su
         JOIN categories c ON c.id = su.category_id
         WHERE su.id = ?
         LIMIT 1`,
        [shopUnitId]
      ),
      query<
        Array<{
          id: number
          allottee_name: string
          contact_person: string | null
          mobile_number: string | null
          payment_amount_paise: number
          payment_status: string
          application_number: string | null
          notes: string | null
          status: string
          allotted_at: string
          actor_name: string | null
        }>
      >(
        `SELECT da.id, da.allottee_name, da.contact_person, da.mobile_number,
                da.payment_amount_paise, da.payment_status, da.application_number,
                da.notes, da.status, da.allotted_at, u.full_name AS actor_name
         FROM direct_allotments da
         LEFT JOIN users u ON u.id = da.allotted_by_user_id
         WHERE da.shop_unit_id = ?
         ORDER BY da.allotted_at DESC`,
        [shopUnitId]
      ),
      query<
        Array<{
          id: number
          allocation_type: string
          status: string
          created_at: string
          application_number: string | null
          representative_name: string | null
        }>
      >(
        `SELECT da.id, da.allocation_type, da.status, da.created_at,
                a.application_number, COALESCE(a.representative_name, a.organisation_name) AS representative_name
         FROM draw_allocations da
         LEFT JOIN applications a ON a.id = da.application_id
         WHERE da.shop_unit_id = ?
         ORDER BY da.created_at DESC`,
        [shopUnitId]
      ),
      query<
        Array<{
          id: number
          action: string
          actor_name: string | null
          previous_value: Record<string, unknown> | null
          new_value: Record<string, unknown> | null
          created_at: string
        }>
      >(
        `SELECT al.id, al.action, u.full_name AS actor_name, al.previous_value, al.new_value, al.created_at
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.actor_user_id
         WHERE al.entity_type = 'shop_unit' AND al.entity_id = ?
         ORDER BY al.created_at DESC
         LIMIT 30`,
        [String(shopUnitId)]
      ),
      query<
        Array<{
          id: number
          category: string
          channel: string
          status: string
          destination: string
          created_at: string
        }>
      >(
        `SELECT nl.id, nl.category, nl.channel, nl.status, nl.destination, nl.created_at
         FROM notification_log nl
         WHERE nl.application_id IN (
           SELECT su.allotted_to_application_id FROM shop_units su WHERE su.id = ? AND su.allotted_to_application_id IS NOT NULL
           UNION
           SELECT da.application_id FROM direct_allotments da WHERE da.shop_unit_id = ? AND da.application_id IS NOT NULL
           UNION
           SELECT draw_al.application_id FROM draw_allocations draw_al WHERE draw_al.shop_unit_id = ? AND draw_al.application_id IS NOT NULL
         )
         ORDER BY nl.created_at DESC
         LIMIT 30`,
        [shopUnitId, shopUnitId, shopUnitId]
      )
    ])

    const unit = units[0]
    if (!unit) {
      return NextResponse.json({ error: 'Booth/stall unit not found.' }, { status: 404 })
    }

    const events: TimelineEvent[] = []

    // Creation event
    events.push({
      id: `created-${unit.id}`,
      timestamp: unit.created_at,
      action: 'stall.created',
      title: `Stall ${unit.stall_number} Created`,
      description: `Initialized as ${unit.shop_type} stall in category "${unit.category_name}"${unit.direction ? ` (${unit.direction})` : ''}.`,
      badgeColor: 'blue'
    })

    for (const da of directAllotments) {
      const amountStr = da.payment_amount_paise > 0 ? `₹${(da.payment_amount_paise / 100).toLocaleString('en-IN')}` : 'Free (₹0)'

      // `direct_allotments.allotted_at` is set once, at row creation, and is
      // never updated when the row is later cancelled/interchanged — so it
      // is only ever a correct timestamp for the CREATION event, never for
      // a cancellation. The cancellation itself is represented below by the
      // audit_logs scan (action: 'allotment.cancelled'), which has its own
      // correctly-timestamped created_at. Emitting a second cancellation
      // event here from `da.allotted_at` showed "Allotment Cancelled" at the
      // original allotment time, i.e. before/at creation — this always
      // emits the creation event regardless of current status.
      events.push({
        id: `da-allotted-${da.id}`,
        timestamp: da.allotted_at,
        action: 'direct_allotment.created',
        title: `Directly Allotted: ${da.allottee_name}`,
        description: `Direct allotment assigned to ${da.allottee_name} (App: ${da.application_number ?? '—'}). Fee: ${amountStr}. Payment: ${da.payment_status}.`,
        actorName: da.actor_name,
        badgeColor: 'purple'
      })
    }

    for (const d of drawAllotments) {
      events.push({
        id: `draw-allotted-${d.id}`,
        timestamp: d.created_at,
        action: 'draw.allotted',
        title: `Draw Allocation: ${d.representative_name ?? 'Candidate'}`,
        description: `Stall allocated via Draw Process to ${d.representative_name ?? 'Candidate'} (App: ${d.application_number ?? '—'}). Status: ${d.status}.`,
        actorName: 'Draw Allocation Engine',
        badgeColor: 'green'
      })
    }

    for (const log of auditLogs) {
      if (log.action === 'allotment.cancelled') {
        const reason = (log.new_value as { reason?: string })?.reason || 'Cancelled by admin'
        events.push({
          id: `audit-cancel-${log.id}`,
          timestamp: log.created_at,
          action: 'allotment.cancelled',
          title: `Allotment Cancelled`,
          description: `Allotment on Stall ${unit.stall_number} was cancelled. Reason: "${reason}".`,
          actorName: log.actor_name,
          badgeColor: 'red'
        })
      } else if (log.action === 'direct_allotment.interchanged') {
        const nv = log.new_value as { reason?: string } | null
        events.push({
          id: `audit-interchange-${log.id}`,
          timestamp: log.created_at,
          action: 'direct_allotment.interchanged',
          title: `Stall Interchanged`,
          description: `Stall assignment was swapped via interchange.${nv?.reason ? ` Reason: ${nv.reason}` : ''}`,
          actorName: log.actor_name,
          badgeColor: 'amber'
        })
      } else if (log.action === 'inventory.updated') {
        events.push({
          id: `audit-update-${log.id}`,
          timestamp: log.created_at,
          action: 'inventory.updated',
          title: `Stall Details Updated`,
          description: `Admin updated stall configuration or status.`,
          actorName: log.actor_name,
          badgeColor: 'slate'
        })
      }
    }

    for (const n of notifications) {
      let title = `Notification Sent (${n.channel.toUpperCase()})`
      let badgeColor: TimelineEvent['badgeColor'] = 'green'

      if (n.category === 'pay_now_activation') {
        title = `Draw Payment Activation (${n.channel.toUpperCase()})`
        badgeColor = 'amber'
      } else if (n.category === 'direct_allotment_payment') {
        title = `Direct Allotment Payment Reminder (${n.channel.toUpperCase()})`
        badgeColor = 'purple'
      } else if (n.category === 'direct_allotment_confirmed') {
        title = `Direct Allotment Confirmed (${n.channel.toUpperCase()})`
        badgeColor = 'green'
      } else if (n.category === 'payment_confirmation') {
        title = `Payment Receipt Dispatched (${n.channel.toUpperCase()})`
        badgeColor = 'green'
      } else if (n.category.includes('reminder')) {
        title = `Payment Reminder Dispatched (${n.channel.toUpperCase()})`
        badgeColor = 'amber'
      }

      events.push({
        id: `notif-${n.id}`,
        timestamp: n.created_at,
        // Channel-qualified: WhatsApp and Email are dispatched together for
        // the same category within the same minute, and the generic
        // 'notification.sent' action previously collided with itself in the
        // dedup step below, silently dropping one of the two channels from
        // the timeline (only the last one sorted-in survived).
        action: `notification.sent.${n.channel}`,
        title,
        description: `Dispatched to ${n.destination} via ${n.channel.toUpperCase()} (${n.status}).`,
        badgeColor
      })
    }

    // Deduplicate & sort descending
    const seen = new Set<string>()
    const uniqueEvents: TimelineEvent[] = []
    
    // Sort all events by timestamp descending
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    for (const ev of events) {
      const key = `${ev.action}-${ev.timestamp.slice(0, 16)}`
      if (!seen.has(key)) {
        seen.add(key)
        uniqueEvents.push(ev)
      }
    }

    return NextResponse.json({
      stallNumber: unit.stall_number,
      categoryName: unit.category_name,
      shopType: unit.shop_type,
      currentStatus: unit.status,
      history: uniqueEvents
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stall history.' },
      { status: 500 }
    )
  }
}
