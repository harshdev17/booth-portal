import { NextResponse } from 'next/server'

import { aadhaarLast4, encryptAadhaar, hashAadhaar } from '@/lib/applications/aadhaar-crypto'
import { generateAccessToken, hashAccessToken } from '@/lib/applications/access-token'
import { generateApplicationNumber } from '@/lib/applications/application-number'
import { logAudit } from '@/lib/audit/log'
import { withTransaction } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'

export async function POST(request: Request) {
  const session = await requirePermission('allotment:perform')
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null

  const categoryId = Number(body?.categoryId)
  const shopUnitId = Number(body?.shopUnitId)
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

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: 'Please select a valid category.' }, { status: 400 })
  }
  if (!Number.isInteger(shopUnitId) || shopUnitId <= 0) {
    return NextResponse.json({ error: 'Please select an available booth/stall.' }, { status: 400 })
  }
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
  const directPaymentStatus = isPaymentRequired ? 'pending' : 'exempt'
  const representativeName = contactPerson || allotteeName

  try {
    const allotted = await withTransaction(async tx => {
      const units = await tx<Array<{ id: number; stall_number: string }>>(
        `SELECT su.id, su.stall_number FROM shop_units su JOIN categories c ON c.id = su.category_id
         WHERE su.id = ? AND su.category_id = ? AND su.status IN ('available', 'reserved_for_direct_allotment')
           AND c.is_direct_allotment = 1 FOR UPDATE`,
        [shopUnitId, categoryId]
      )
      const unit = units[0]
      if (!unit) throw new Error('This stall is no longer available for the selected direct category.')

      const aadhaarCiphertext = encryptAadhaar(aadhaarNumber)
      const last4 = aadhaarLast4(aadhaarNumber)
      const aadhaarHash = hashAadhaar(aadhaarNumber)
      const rawAccessToken = generateAccessToken()
      const accessTokenHash = hashAccessToken(rawAccessToken)

      // Try generating unique application number
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

      // Insert direct_allotments with new mandatory details
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

      // Update shop_units status and link to application
      await tx(
        `UPDATE shop_units SET status = ?, allotted_to_application_id = ? WHERE id = ?`,
        [shopStatus, applicationId, shopUnitId]
      )

      // If payment required, seed payments table
      if (isPaymentRequired) {
        await tx(
          `INSERT INTO payments (application_id, purpose, amount_paise, status)
           VALUES (?, 'pay_now', ?, 'not_initiated')
           ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
          [applicationId, paymentAmountPaise, paymentAmountPaise]
        )
      }

      return {
        id: directResult.insertId,
        stallNumber: unit.stall_number,
        applicationId,
        applicationNumber,
        isPaymentRequired
      }
    })

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'direct_allotment.created',
      module: 'allotment',
      entityType: 'direct_allotment',
      entityId: String(allotted.id),
      newValue: {
        categoryId,
        shopUnitId,
        stallNumber: allotted.stallNumber,
        applicationNumber: allotted.applicationNumber,
        allotteeName,
        representativeName,
        mobileNumber,
        email,
        paymentAmountRupees,
        sendNotification: sendNotificationToggle
      }
    })

    // Dispatch notification if toggle is enabled
    if (sendNotificationToggle) {
      const destination = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber}`
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
      const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(allotted.applicationNumber)}` : ''
      const letterLink = baseUrl ? `${baseUrl}/allotment-letter?appNo=${encodeURIComponent(allotted.applicationNumber)}` : ''

      if (allotted.isPaymentRequired) {
        // Send direct allotment payment link activation
        sendNotification({
          category: 'direct_allotment_payment',
          destination,
          userName: representativeName,
          templateParams: [representativeName, allotted.applicationNumber, payLink],
          applicationId: allotted.applicationId,
          email
        }).catch(err => {
          console.error('[direct-allotments] Payment notification send failure:', err)
        })
      } else {
        // Free allotment (0 amount): send direct allotment confirmation & download link
        sendNotification({
          category: 'direct_allotment_confirmed',
          destination,
          userName: representativeName,
          templateParams: [representativeName, allotted.applicationNumber, letterLink],
          applicationId: allotted.applicationId,
          email
        }).catch(err => {
          console.error('[direct-allotments] Allotment status notification failure:', err)
        })
      }
    }

    return NextResponse.json(allotted, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to allot the stall.' }, { status: 409 })
  }
}
