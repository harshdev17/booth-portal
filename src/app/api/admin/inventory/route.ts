import { NextResponse } from 'next/server'

import { aadhaarLast4, encryptAadhaar, hashAadhaar } from '@/lib/applications/aadhaar-crypto'
import { generateAccessToken, hashAccessToken } from '@/lib/applications/access-token'
import { generateApplicationNumber } from '@/lib/applications/application-number'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction } from '@/lib/db/client'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { encodeId } from '@/lib/security/opaque-id'

type CreateBody = {
  stallNumber?: unknown
  shopType?: unknown
  categoryName?: unknown
  isNewCategory?: unknown
  newCategoryFee?: unknown
  direction?: unknown
  emdAmountPaise?: unknown
  isDirectAllotment?: unknown
  allotteeName?: unknown
  fatherName?: unknown
  aadhaarNumber?: unknown
  contactPerson?: unknown
  address?: unknown
  mobileNumber?: unknown
  email?: unknown
  workPurpose?: unknown
  notes?: unknown
  sendNotification?: unknown
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}

/**
 * Creates one booth/stall unit directly from the admin UI.
 * Supports:
 * 1. Standard stall creation with status 'available'.
 * 2. Creating a new category on the fly with initial category pricing.
 * 3. Direct Allotment mode: marks stall as 'allotted', creates linked application,
 *    stores full direct allotment record, and optionally dispatches notifications.
 */
export async function POST(request: Request) {
  try {
    const session = await requirePermission('inventory:manage')

    let body: CreateBody

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
    }

    const stallNumber = typeof body.stallNumber === 'string' ? body.stallNumber.trim() : ''
    const shopType = body.shopType === 'single' || body.shopType === 'double' ? body.shopType : null
    const categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : ''
    const direction = typeof body.direction === 'string' && body.direction.trim() ? body.direction.trim() : null
    const isDirectAllotment = Boolean(body.isDirectAllotment)
    const newCategoryFeePaise = Math.max(0, Math.round(Number(body.newCategoryFee || 0) * 100))

    // Direct Allotment fields
    const allotteeName = typeof body.allotteeName === 'string' ? body.allotteeName.trim() : ''
    const fatherName = typeof body.fatherName === 'string' ? body.fatherName.trim() : ''
    const aadhaarNumber = typeof body.aadhaarNumber === 'string' ? body.aadhaarNumber.trim().replace(/\s+/g, '') : ''
    const contactPerson = typeof body.contactPerson === 'string' && body.contactPerson.trim() ? body.contactPerson.trim() : null
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const mobileNumber = typeof body.mobileNumber === 'string' ? body.mobileNumber.trim().replace(/\D/g, '').slice(-10) : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const workPurpose = typeof body.workPurpose === 'string' ? body.workPurpose.trim() : ''
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    const sendNotificationToggle = body.sendNotification !== false

    if (!stallNumber) {
      return NextResponse.json({ error: 'Booth/Stall number is required.' }, { status: 400 })
    }

    if (!shopType) {
      return NextResponse.json({ error: 'Type must be Single or Double.' }, { status: 400 })
    }

    if (!categoryName) {
      return NextResponse.json({ error: 'Category is required.' }, { status: 400 })
    }

    if (isDirectAllotment) {
      if (!allotteeName) {
        return NextResponse.json({ error: 'Organisation / Allottee name is mandatory.' }, { status: 400 })
      }
      if (!fatherName) {
        return NextResponse.json({ error: "Father's / Husband's name is mandatory." }, { status: 400 })
      }
      if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
        return NextResponse.json({ error: 'A valid 12-digit Aadhaar number is mandatory.' }, { status: 400 })
      }
      if (!address) {
        return NextResponse.json({ error: 'Complete postal address is mandatory.' }, { status: 400 })
      }
      if (!mobileNumber || mobileNumber.length !== 10) {
        return NextResponse.json({ error: 'A valid 10-digit mobile number is mandatory.' }, { status: 400 })
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'A valid email address is mandatory.' }, { status: 400 })
      }
      if (!workPurpose) {
        return NextResponse.json({ error: 'Purpose of stall / activity is mandatory.' }, { status: 400 })
      }
    }

    const categoryRows = await query<Array<{
      id: number
      is_direct_allotment: number
      allotment_amount_paise: number | null
      allotment_payment_enabled: number
    }>>(
      `SELECT id, is_direct_allotment, allotment_amount_paise, allotment_payment_enabled FROM categories
       WHERE status != 'archived' AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(slug)) = LOWER(TRIM(?)))
       LIMIT 1`,
      [categoryName, categoryName]
    )

    let categoryId = categoryRows[0]?.id
    let categoryAllotmentPaise = categoryRows[0]?.allotment_amount_paise ? Number(categoryRows[0].allotment_amount_paise) : 0
    let categoryPaymentEnabled = Boolean(categoryRows[0]?.allotment_payment_enabled)
    const isNewCategory = !categoryId

    if (!categoryId) {
      // Create new category on the fly
      const eventRows = await query<Array<{ id: number }>>(`SELECT id FROM events WHERE status = 'active' ORDER BY id DESC LIMIT 1`)
      const eventId = eventRows[0]?.id ?? 1
      const baseSlug = slugify(categoryName) || `cat-${Date.now()}`
      const taken = await query<Array<{ slug: string }>>(`SELECT slug FROM categories WHERE slug LIKE ?`, [`${baseSlug}%`])
      const slug = taken.some(row => row.slug === baseSlug) ? `${baseSlug}-${taken.length + 1}` : baseSlug

      categoryAllotmentPaise = newCategoryFeePaise
      categoryPaymentEnabled = newCategoryFeePaise > 0

      // status was previously passed as 'active'/'closed' — NEITHER is a
      // valid categories.status enum value (it's 'draft' | 'open' | 'closed'
      // | 'archived'), which MySQL was silently storing as an empty string
      // instead of raising an error, confirmed live (a category created
      // here had status = '' in the DB). A category created on the fly from
      // this admin-only dialog should never be public/open regardless of
      // the Direct Allotment toggle — 'draft' keeps it correctly hidden from
      // the home page and un-appliable-to, same as the bulk-import "create
      // on the fly" path (api/admin/inventory/import/route.ts).
      const newCatResult = await query<{ insertId: number }>(
        `INSERT INTO categories (
           event_id, slug, name, selection_method, status, fee_paise,
           allotment_amount_paise, allotment_payment_enabled, allotment_payment_deadline_at,
           is_direct_allotment, display_order
         ) VALUES (?, ?, ?, ?, 'draft', 0, ?, ?, DATE_ADD(NOW(), INTERVAL 3 DAY), ?, 9999)`,
        [
          eventId,
          slug,
          categoryName,
          isDirectAllotment ? 'manual' : 'lottery',
          categoryAllotmentPaise,
          categoryPaymentEnabled ? 1 : 0,
          isDirectAllotment ? 1 : 0
        ]
      )

      categoryId = newCatResult.insertId

      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: isDirectAllotment ? 'direct_category.created' : 'category.created',
        module: 'inventory',
        entityType: 'category',
        entityId: String(categoryId),
        newValue: { name: categoryName, slug, isDirectAllotment, allotmentAmountPaise: categoryAllotmentPaise }
      })
    } else if (isDirectAllotment && categoryRows[0].is_direct_allotment !== 1) {
      await query(`UPDATE categories SET is_direct_allotment = 1 WHERE id = ?`, [categoryId])
    }

    const existing = await query<Array<{ id: number }>>(
      `SELECT id FROM shop_units WHERE stall_number = ? LIMIT 1`,
      [stallNumber]
    )

    if (existing.length > 0) {
      return NextResponse.json({ error: `Booth/Stall number "${stallNumber}" already exists.` }, { status: 409 })
    }

    if (isDirectAllotment) {
      const isPaymentRequired = categoryPaymentEnabled && categoryAllotmentPaise > 0
      const appStatus = isPaymentRequired ? 'payment_required' : 'allotted'
      const shopStatus = isPaymentRequired ? 'reserved' : 'allotted'
      const directPaymentStatus = isPaymentRequired ? 'pending' : 'exempt'
      const representativeName = contactPerson || allotteeName

      const aadhaarCiphertext = encryptAadhaar(aadhaarNumber)
      const last4 = aadhaarLast4(aadhaarNumber)
      const aadhaarHash = hashAadhaar(aadhaarNumber)
      const rawAccessToken = generateAccessToken()
      const accessTokenHash = hashAccessToken(rawAccessToken)

      const created = await withTransaction(async tx => {
        // 1. Generate official application record
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

        // 2. Insert stall unit linked to application
        const stallResult = await tx<{ insertId: number }>(
          `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status, allotted_to_application_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [categoryId, stallNumber, shopType, direction, categoryAllotmentPaise || null, shopStatus, applicationId]
        )

        const unitId = stallResult.insertId

        // 3. Insert direct_allotments record
        const allotmentResult = await tx<{ insertId: number }>(
          `INSERT INTO direct_allotments (
             category_id, shop_unit_id, allottee_name, contact_person,
             father_name, aadhaar_number, address, mobile_number, email, work_purpose,
             payment_amount_paise, payment_status, application_id, application_number,
             notes, status, allotted_by_user_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
          [
            categoryId,
            unitId,
            allotteeName,
            contactPerson || null,
            fatherName,
            aadhaarNumber,
            address,
            mobileNumber,
            email,
            workPurpose,
            categoryAllotmentPaise,
            directPaymentStatus,
            applicationId,
            applicationNumber,
            notes,
            session.userId
          ]
        )

        // 4. If payment required, seed payment row
        if (isPaymentRequired) {
          await tx(
            `INSERT INTO payments (application_id, purpose, amount_paise, status)
             VALUES (?, 'pay_now', ?, 'not_initiated')
             ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
            [applicationId, categoryAllotmentPaise, categoryAllotmentPaise]
          )
        }

        return { unitId, allotmentId: allotmentResult.insertId, applicationId, applicationNumber, isPaymentRequired }
      })

      // Send WhatsApp and Email Notification if enabled
      if (sendNotificationToggle) {
        const dest = mobileNumber.startsWith('+') ? mobileNumber : `+91${mobileNumber.replace(/\D/g, '').slice(-10)}`
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
        const payLink = baseUrl ? `${baseUrl}/status?appNo=${encodeURIComponent(created.applicationNumber)}` : ''
        const letterLink = baseUrl ? `${baseUrl}/allotment-letter?appNo=${encodeURIComponent(created.applicationNumber)}` : ''

        if (created.isPaymentRequired) {
          await sendNotification({
            category: 'direct_allotment_payment',
            destination: dest,
            userName: representativeName,
            templateParams: [representativeName, created.applicationNumber, payLink],
            applicationId: created.applicationId,
            email
          }).catch(err => logServerError('inventory.direct_allotment.notification', err))
        } else {
          await sendNotification({
            category: 'direct_allotment_confirmed',
            destination: dest,
            userName: representativeName,
            templateParams: [representativeName, created.applicationNumber, letterLink],
            applicationId: created.applicationId,
            email
          }).catch(err => logServerError('inventory.direct_allotment.notification', err))
        }
      }

      await logAudit({
        actorUserId: session.userId,
        actorRoleKey: session.role.key,
        action: 'inventory.created_and_allotted',
        module: 'inventory',
        entityType: 'shop_unit',
        entityId: String(created.unitId),
        newValue: { stallNumber, shopType, categoryName, direction, allotteeName, applicationNumber: created.applicationNumber }
      })

      return NextResponse.json({
        id: encodeId(created.unitId),
        stallNumber,
        categoryName,
        shopType,
        direction,
        emdAmountPaise: categoryAllotmentPaise || null,
        status: shopStatus,
        applicationNumber: created.applicationNumber,
        isDirectAllotment: true,
        createdAt: new Date().toISOString()
      }, { status: 201 })
    }

    // A stall created under a category that was just auto-created here
    // (non-public/draft, not one of the real homepage categories) is never
    // "Available" — that category was never set up with the fees/
    // guidelines/schedule a public applicant flow needs, so its stalls are
    // for direct allotment only by definition (same rule as the bulk-import
    // "create on the fly" path, api/admin/inventory/import/route.ts).
    const newStatus = isNewCategory ? 'reserved_for_direct_allotment' : 'available'

    const result = await query<{ insertId: number }>(
      `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categoryId, stallNumber, shopType, direction, categoryAllotmentPaise || null, newStatus]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'inventory.created',
      module: 'inventory',
      entityType: 'shop_unit',
      entityId: String(result.insertId),
      newValue: { stallNumber, shopType, categoryName, direction, status: newStatus }
    })

    return NextResponse.json({
      id: encodeId(result.insertId),
      stallNumber,
      categoryName,
      shopType,
      direction,
      emdAmountPaise: categoryAllotmentPaise || null,
      status: newStatus,
      applicationNumber: null,
      isDirectAllotment: false,
      createdAt: new Date().toISOString()
    }, { status: 201 })
  } catch (error) {
    logServerError('api.admin.inventory.create', error)

    return NextResponse.json({ error: 'Something went wrong while creating the booth/stall unit.' }, { status: 500 })
  }
}
