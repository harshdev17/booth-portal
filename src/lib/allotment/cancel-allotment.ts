import 'server-only'

import { logAudit } from '@/lib/audit/log'
import { withTransaction } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'

export type CancelAllotmentParams = {
  shopUnitId?: number
  applicationId?: number
  reason?: string
  sendNotification?: boolean
  actorUserId: number
  actorRoleKey: string
}

export type CancelAllotmentResult = {
  success: boolean
  shopUnitId: number
  stallNumber: string
  applicationId: number | null
  applicationNumber: string | null
  previousStatus: string
}

/**
 * Cancels an allotment cleanly across all related records:
 * 1. Finds the shop_unit and ensures it is allotted or reserved.
 * 2. Unlinks shop_units (status -> 'available', allotted_to_application_id -> null).
 * 3. Updates application status to 'cancelled' (if linked).
 * 4. Updates direct_allotments status to 'cancelled' (if active record exists).
 * 5. Cancels pending payment orders for the application.
 * 6. Logs audit trail.
 * 7. Optionally dispatches cancellation notification to the applicant.
 */
export async function cancelStallAllotment(params: CancelAllotmentParams): Promise<CancelAllotmentResult> {
  const { shopUnitId, applicationId, reason, sendNotification = true, actorUserId, actorRoleKey } = params

  if (!shopUnitId && !applicationId) {
    throw new Error('Either shopUnitId or applicationId must be provided.')
  }

  const result = await withTransaction(async tx => {
    let unitRow: {
      id: number
      stall_number: string
      status: string
      allotted_to_application_id: number | null
      category_id: number
    } | null = null

    if (shopUnitId) {
      const units = await tx<Array<{
        id: number
        stall_number: string
        status: string
        allotted_to_application_id: number | null
        category_id: number
      }>>(
        `SELECT id, stall_number, status, allotted_to_application_id, category_id
         FROM shop_units
         WHERE id = ?
         FOR UPDATE`,
        [shopUnitId]
      )
      unitRow = units[0] ?? null
    } else if (applicationId) {
      const units = await tx<Array<{
        id: number
        stall_number: string
        status: string
        allotted_to_application_id: number | null
        category_id: number
      }>>(
        `SELECT id, stall_number, status, allotted_to_application_id, category_id
         FROM shop_units
         WHERE allotted_to_application_id = ?
         LIMIT 1
         FOR UPDATE`,
        [applicationId]
      )
      unitRow = units[0] ?? null
    }

    if (!unitRow) {
      throw new Error('Booth/Stall unit not found.')
    }

    const resolvedAppId = unitRow.allotted_to_application_id || applicationId || null
    let appRecord: {
      id: number
      application_number: string
      status: string
      mobile_number: string
      email: string | null
      representative_name: string
    } | null = null

    if (resolvedAppId) {
      const apps = await tx<Array<{
        id: number
        application_number: string
        status: string
        mobile_number: string
        email: string | null
        representative_name: string
      }>>(
        `SELECT id, application_number, status, mobile_number, email, representative_name
         FROM applications
         WHERE id = ?
         FOR UPDATE`,
        [resolvedAppId]
      )
      appRecord = apps[0] ?? null

      if (appRecord) {
        // Mark application as cancelled
        await tx(
          `UPDATE applications
           SET status = 'cancelled', updated_at = NOW()
           WHERE id = ?`,
          [appRecord.id]
        )

        // Cancel pending payments (not yet successful)
        await tx(
          `UPDATE payments
           SET status = 'cancelled', updated_at = NOW()
           WHERE application_id = ? AND status != 'success'`,
          [appRecord.id]
        )
      }
    }

    // Cancel active direct_allotment record if one exists
    await tx(
      `UPDATE direct_allotments
       SET status = 'cancelled'
       WHERE (shop_unit_id = ? OR (application_id IS NOT NULL AND application_id = ?))
         AND status = 'active'`,
      [unitRow.id, resolvedAppId ?? 0]
    )

    // Free the booth/stall unit so it is immediately Available for re-allocation
    await tx(
      `UPDATE shop_units
       SET status = 'available', allotted_to_application_id = NULL, updated_at = NOW()
       WHERE id = ?`,
      [unitRow.id]
    )

    return {
      shopUnitId: unitRow.id,
      stallNumber: unitRow.stall_number,
      previousStatus: unitRow.status,
      applicationId: appRecord?.id ?? resolvedAppId,
      applicationNumber: appRecord?.application_number ?? null,
      appRecord
    }
  })

  // Log audit trail
  await logAudit({
    actorUserId,
    actorRoleKey,
    action: 'allotment.cancelled',
    module: 'allotment',
    entityType: 'shop_unit',
    entityId: String(result.shopUnitId),
    previousValue: {
      stallNumber: result.stallNumber,
      status: result.previousStatus,
      applicationId: result.applicationId,
      applicationNumber: result.applicationNumber
    },
    newValue: {
      stallNumber: result.stallNumber,
      status: 'available',
      reason: reason || 'Cancelled by admin',
      allottedToApplicationId: null
    }
  })

  // Send cancellation notice if toggled and applicant contact is available
  if (sendNotification && result.appRecord) {
    try {
      await notifyApplicationStatusChange({
        applicationId: result.appRecord.id,
        applicationNumber: result.appRecord.application_number,
        mobileNumber: result.appRecord.mobile_number,
        email: result.appRecord.email,
        representativeName: result.appRecord.representative_name,
        newStatus: 'cancelled'
      })
    } catch (notifErr) {
      console.error('[cancelStallAllotment] Failed to send cancellation notification:', notifErr)
    }
  }

  return {
    success: true,
    shopUnitId: result.shopUnitId,
    stallNumber: result.stallNumber,
    applicationId: result.applicationId,
    applicationNumber: result.applicationNumber,
    previousStatus: result.previousStatus
  }
}
