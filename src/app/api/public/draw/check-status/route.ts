import { NextResponse } from 'next/server'
import { query } from '@/lib/db/client'

/**
 * Public high-throughput result verification endpoint for applicants.
 * Query by Application Number + Mobile Number.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const applicationNumber = String(body.applicationNumber ?? '').trim()
    const mobileNumber = String(body.mobileNumber ?? '').trim()

    if (!applicationNumber || !mobileNumber) {
      return NextResponse.json(
        { error: 'Please enter both Application Number and Registered Mobile Number.' },
        { status: 400 }
      )
    }

    // Lookup application + draw allocation result
    const rows = await query<any[]>(
      `SELECT a.id, a.application_number, a.representative_name, a.status AS app_status,
              c.name AS category_name,
              da.allocation_type, da.draw_position, da.waitlist_position, da.verification_token,
              su.stall_number, su.direction, su.shop_type,
              de.draw_code, de.round_number, de.completed_at
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN draw_allocations da ON da.application_id = a.id
       LEFT JOIN shop_units su ON su.id = da.shop_unit_id
       LEFT JOIN draw_events de ON de.id = da.draw_event_id
       WHERE a.application_number = ? AND a.mobile_number = ?
       LIMIT 1`,
      [applicationNumber, mobileNumber]
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No matching application found for provided credentials.' },
        { status: 404 }
      )
    }

    const app = rows[0]

    if (!app.allocation_type) {
      return NextResponse.json({
        found: true,
        status: 'pending_draw',
        message: 'Your application is registered. Draw allocation is either pending or not yet published.',
        applicationNumber: app.application_number,
        representativeName: app.representative_name,
        categoryName: app.category_name,
        currentStatus: app.app_status
      })
    }

    return NextResponse.json({
      found: true,
      status: app.allocation_type,
      applicationNumber: app.application_number,
      representativeName: app.representative_name,
      categoryName: app.category_name,
      stallNumber: app.stall_number,
      stallType: app.shop_type,
      direction: app.direction,
      drawPosition: app.draw_position,
      waitlistPosition: app.waitlist_position,
      drawCode: app.draw_code,
      verificationToken: app.verification_token,
      completedAt: app.completed_at
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'An unexpected error occurred while looking up results.' },
      { status: 500 }
    )
  }
}
