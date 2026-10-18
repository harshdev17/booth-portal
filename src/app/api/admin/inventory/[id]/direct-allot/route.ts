import { NextResponse } from 'next/server'

import { aadhaarLast4, encryptAadhaar, hashAadhaar } from '@/lib/applications/aadhaar-crypto'
import { generateAccessToken, hashAccessToken } from '@/lib/applications/access-token'
import { generateApplicationNumber } from '@/lib/applications/application-number'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'
import { requireAnyPermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { decodeId } from '@/lib/security/opaque-id'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAnyPermission(['allotment:perform', 'inventory:manage'])
    const { id } = await params

    const shopUnitId = decodeId(id) ?? (Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : null)

    if (shopUnitId === null) {
      return NextResponse.json({ error: 'Invalid booth/stall unit.' }, { status: 400 })
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

    const allotteeName = typeof body?.allotteeName === 'string' ? body.allotteeName.trim() : ''
    const contactPerson = typeof body?.contactPerson === 'string' ? body.contactPerson.trim() : ''
    const fatherName = typeof body?.fatherName === 'string' ? body.fatherName.trim() : ''
    const aadhaarNumber = typeof body?.aadhaarNumber === 'string' ? body.aadhaarNumber.trim().replace(/\s+/g, '') : ''
    const address = typeof body?.address === 'string' ? body.address.trim() : ''
    const mobileNumber = typeof body?.mobileNumber === 'string' ? body.mobileNumber.trim().replace(/\D/g, '').slice(-10) : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const workPurpose = typeof body?.workPurpose === 'string' ? body.workPurpose.trim() : ''
    const notes = typeof body?.notes === 'string' ? body.notes.trim() || null : null
    const paymentAmountRupees = Math.max(0, Math.round(Number(body?.paymentAmountRupees || 0)))
    const sendNotificationToggle = body?.sendNotification !== false

    // Validation
    if (!allotteeName) {
      return NextResponse.json({ error: 'Organisation / Allottee name is mandatory.' }, { status: 400 })
    }
    if (!fatherName) {
      return NextResponse.json({ error: "Father's name is mandatory." }, { status: 400 })
    }
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return NextResponse.json({ error: 'Aadhaar card number must be exactly 12 digits.' }, { status: 400 })
    }
    if (!address) {
      return NextResponse.json({ error: 'Full address is mandatory.' }, { status: 400 })
    }
    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return NextResponse.json({ error: 'A valid 10-digit Indian mobile number is mandatory.' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is mandatory.' }, { status: 400 })
    }
    if (!workPurpose) {
      return NextResponse.json({ error: 'Purpose of stall / activity is mandatory.' }, { status: 400 })
    }

    const paymentAmountPaise = paymentAmountRupees * 100
    const isPaymentRequired = paymentAmountPaise > 0
    const appStatus = isPaymentRequired ? 'payment_required' : 'allotted'
    const shopStatus = isPaymentRequired ? 'reserved' : 'allotted'
    const directPaymentStatus = isPaymentRequired ? 'pending' : 'not_required'
    const representativeName = contactPerson || allotteeName

    const result = await withTransaction(async tx => {
      const units = await tx<Array<{ id: number; stall_number: string; category_id: number; status: string }>>(
        `SELECT id, stall_number, category_id, status FROM shop_units WHERE id = ? FOR UPDATE`,
        [shopUnitId]
      )
      const unit = units[0]
      if (!unit) throw new Error('Booth/Stall unit not found.')
      if (unit.status !== 'available') {
        throw new Error(`Stall ${unit.stall_number} is currently "${unit.status}" and cannot be allotted. Cancel any existing allotment first.`)
      }

      const categoryId = unit.category_id

      // Ensure category has is_direct_allotment marked if needed
      await tx(`UPDATE categories SET is_direct_allotment = 1 WHERE id = ? AND is_direct_allotment = 0`, [categoryId])

      const aadhaarCiphertext = encryptAadhaar(aadhaarNumber)
      const last4 = aadhaarLast4(aadhaarNumber)
      const aadhaarHash = hashAadhaar(aadhaarNumber)
      const rawAccessToken = generateAccessToken()
      const accessTokenHash = hashAccessToken(rawAccessToken)

      let applicationNumber = ''
      let appInsertResult: { insertId: number } | null = null

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          applicationNumber = generateApplicationNumber(new Date().getFullYear())
          appInsertResult = await tx<{ insertId: number }>(
            `INSERT INTO applications (
               application_number, category_id,
               email, organisation_name, representative_name, father_name,
               aadhaar_ciphertext, aadhaar_last4, aadhaar_hash,
               address, state, district, pin_code, mobile_number,
               work_purpose, achievement_experience,
               status, access_token_hash, declaration_accepted_at, submitted_at
             ) VALUES (
               ?, ?,
               ?, ?, ?, ?,
               ?, ?, ?,
               ?, 'Haryana', 'Kurukshetra', '136118', ?,
               ?, '',
               ?, ?, NOW(), NOW()
             )`,
            [
              applicationNumber,
              categoryId,
              email,
              allotteeName,
              representativeName,
              fatherName,
              aadhaarCiphertext,
              last4,
              aadhaarHash,
              address,
              mobileNumber,
              workPurpose,
              appStatus,
              accessTokenHash
            ]
          )
          break
        } catch (err: unknown) {
          const isDup =
            typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ER_DUP_ENTRY'
          if (!isDup || attempt === 4) throw err
        }
      }

      if (!appInsertResult) {
        throw new Error('Failed to generate official application record.')
      }

      const applicationId = appInsertResult.insertId

      // Insert direct_allotment
      const directResult = await tx<{ insertId: number }>(
        `INSERT INTO direct_allotments (
           category_id, shop_unit_id, allottee_name, contact_person,
           father_name, aadhaar_number, address, mobile_number, email, work_purpose,
           payment_amount_paise, payment_status, application_id, application_number,
           notes, status, allotted_by_user_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [
          categoryId,
          shopUnitId,
          allotteeName,
          contactPerson || null,
          fatherName,
          aadhaarNumber,
          address,
          mobileNumber,
          email,
          workPurpose,
          paymentAmountPaise,
          directPaymentStatus,
          applicationId,
          applicationNumber,
          notes,
          session.userId
        ]
      )

      // Update shop_units status & link
      await tx(
        `UPDATE shop_units SET status = ?, allotted_to_application_id = ?, updated_at = NOW() WHERE id = ?`,
        [shopStatus, applicationId, shopUnitId]
      )

      // Seed payment order if payment is required
      if (isPaymentRequired) {
        await tx(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'pay_now', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [applicationId, paymentAmountPaise, paymentAmountPaise]
        )
      }

      return {
        directAllotmentId: directResult.insertId,
        shopUnitId,
        stallNumber: unit.stall_number,
        applicationId,
        applicationNumber,
        shopStatus,
        isPaymentRequired
      }
    })

    // Log audit
    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'direct_allotment.created',
      module: 'allotment',
      entityType: 'direct_allotment',
      entityId: String(result.directAllotmentId),
      newValue: {
        shopUnitId,
        stallNumber: result.stallNumber,
        applicationNumber: result.applicationNumber,
        allotteeName,
        representativeName,
        mobileNumber,
        email,
        paymentAmountRupees,
        sendNotification: sendNotificationToggle
      }
    })

    // Dispatch notification
    if (sendNotificationToggle) {
      const destination = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`
      if (result.isPaymentRequired) {
        sendNotification({
          category: 'pay_now_activation',
          destination,
          userName: representativeName,
          templateParams: [representativeName, result.applicationNumber],
          buttonParam: result.applicationNumber,
          applicationId: result.applicationId,
          email
        }).catch(err => {
          console.error('[inventory/direct-allot] Payment notification send failure:', err)
        })
      } else {
        notifyApplicationStatusChange({
          applicationId: result.applicationId,
          applicationNumber: result.applicationNumber,
          mobileNumber,
          email,
          representativeName,
          newStatus: 'allotted'
        }).catch(err => {
          console.error('[inventory/direct-allot] Allotment status notification failure:', err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      shopUnitId: result.shopUnitId,
      stallNumber: result.stallNumber,
      applicationId: result.applicationId,
      applicationNumber: result.applicationNumber,
      status: result.shopStatus,
      isDirectAllotment: true
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Something went wrong during direct allotment.'
    logServerError('api.admin.inventory.direct-allot', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
