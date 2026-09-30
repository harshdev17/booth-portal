'use server'

import { headers } from 'next/headers'

import { z } from 'zod'

import { generateAccessToken, hashAccessToken } from '@/lib/applications/access-token'
import { getCategoryBySlug, isCategoryAcceptingApplications } from '@/lib/applications/categories'
import { encryptAadhaar, aadhaarLast4 } from '@/lib/applications/aadhaar-crypto'
import { generateApplicationNumber } from '@/lib/applications/application-number'
import { query, withTransaction } from '@/lib/db/client'
import { requestOtp } from '@/lib/notifications/otp'
import { requirePermission } from '@/lib/rbac/authorize'

export type CreatePaymentTestState = {
  error?: string
  success?: {
    applicationId: number
    applicationNumber: string
    accessToken: string
    categorySlug: string
    mobileNumber: string
  }
}

const mobileSchema = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

/**
 * Admin-only tool: creates one real, throwaway application (dummy applicant
 * details, but the admin's own real mobile number) and sends it a real
 * WhatsApp OTP — the two steps that genuinely cannot be automated (typing
 * in the real OTP, completing the real Razorpay checkout UI) are left for
 * the admin to finish by hand, via the returned application number + access
 * token, which they carry into the real public Review/Payment pages in the
 * same browser tab. This exercises the exact same code paths a real
 * applicant hits — no shortcut/bypass of finalize, OTP, or payment
 * verification is taken anywhere in this flow.
 *
 * Never call this against a category with real applicant traffic without
 * meaning to create real test noise in that category's application list —
 * the created application is real, not a mock, and shows up in
 * /admin/applications like any other.
 */
export async function createRealPaymentTestApplication(
  _prevState: CreatePaymentTestState,
  formData: FormData
): Promise<CreatePaymentTestState> {
  const session = await requirePermission('config:manage')

  const mobileParsed = mobileSchema.safeParse(formData.get('mobileNumber'))

  if (!mobileParsed.success) {
    return { error: mobileParsed.error.issues[0]?.message ?? 'Enter a valid mobile number.' }
  }

  const categorySlugRaw = formData.get('categorySlug')
  const categorySlug = typeof categorySlugRaw === 'string' && categorySlugRaw ? categorySlugRaw : null

  let resolvedSlug = categorySlug

  if (!resolvedSlug) {
    const fallbackRows = await query<Array<{ slug: string }>>(
      `SELECT slug FROM categories WHERE status != 'archived' AND fee_paise IS NOT NULL ORDER BY display_order ASC LIMIT 1`
    )

    resolvedSlug = fallbackRows[0]?.slug ?? null
  }

  const category = resolvedSlug ? await getCategoryBySlug(resolvedSlug) : null

  if (!category) {
    return { error: 'No category with a configured fee is available to test against.' }
  }

  if (category.fee_paise === null) {
    return { error: `"${category.name}" has no fee configured — pick a category with a fee for a payment test.` }
  }

  // This tool deliberately allows picking a category outside its public
  // application window (see the razorpay settings page's own comment on
  // why it doesn't use listOpenCategories()) — but finalizeApplication()
  // still enforces isCategoryAcceptingApplications() for real, so surface
  // that clearly here rather than letting the admin discover it as a
  // confusing failure several steps later on the Review page.
  if (!isCategoryAcceptingApplications(category)) {
    return {
      error: `"${category.name}" is outside its public application window (opens/closes dates), so a real applicant couldn't submit to it right now either — finalize will be rejected. Temporarily widen its schedule in Settings → Fees, GST & Categories, or pick a category that's currently open, to test the full flow.`
    }
  }

  const mobileNumber = mobileParsed.data
  const requestHeaders = await headers()
  const ipAddress = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  try {
    const accessToken = generateAccessToken()
    const accessTokenHash = hashAccessToken(accessToken)
    const testAadhaar = '999999999999'
    const aadhaarCiphertext = encryptAadhaar(testAadhaar)
    const last4 = aadhaarLast4(testAadhaar)
    const timestamp = Date.now()

    const { applicationId, applicationNumber } = await withTransaction(async txQuery => {
      let candidateNumber = ''
      let insertId = 0

      // Same retry-on-collision pattern as the real draft-creation path
      // (see createDraftApplication) — application_number is unique.
      for (let attempt = 0; attempt < 5; attempt++) {
        candidateNumber = generateApplicationNumber(new Date().getFullYear())

        try {
          const result = await txQuery<{ insertId: number }>(
            `INSERT INTO applications (
               application_number, category_id, shop_option_id,
               email, organisation_name, representative_name, father_name,
               aadhaar_ciphertext, aadhaar_last4,
               address, state, district, pin_code, mobile_number, alternate_mobile,
               work_purpose, achievement_experience, remarks,
               status, access_token_hash, ip_address
             ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'draft', ?, ?)`,
            [
              candidateNumber,
              category.id,
              `payment-test-${timestamp}@kdb-admin-test.local`,
              'Admin Payment Test',
              'Admin Payment Test',
              'Test Father Name',
              aadhaarCiphertext,
              last4,
              'Test Address, Admin Payment Test',
              'Haryana',
              'Kurukshetra',
              '136118',
              mobileNumber,
              'Real end-to-end Razorpay payment test, created by admin tool',
              'N/A — admin payment test',
              `[ADMIN PAYMENT TEST — safe to ignore/delete] created ${new Date().toISOString()}`,
              accessTokenHash,
              ipAddress
            ]
          )

          insertId = result.insertId
          break
        } catch (error) {
          // ER_DUP_ENTRY on the application_number unique key — same retry
          // pattern as insertApplicationNumberWithRetry in create-application.ts.
          const mysqlError = error as { code?: string }

          if (mysqlError.code !== 'ER_DUP_ENTRY' || attempt === 4) throw error
        }
      }

      if (!insertId) throw new Error('Could not generate a unique application number.')

      await txQuery(
        `INSERT INTO audit_logs (actor_user_id, actor_role_key, action, module, entity_type, entity_id, ip_address)
         VALUES (?, ?, 'payment.test_application_created', 'payments', 'application', ?, ?)`,
        [session.userId, session.role.key, String(insertId), ipAddress]
      )

      return { applicationId: insertId, applicationNumber: candidateNumber }
    })

    const otpResult = await requestOtp({
      mobileNumber: `+91${mobileNumber}`,
      purpose: 'applicant_mobile_verification',
      applicationId,
      ipAddress
    })

    if (!otpResult.ok) {
      return {
        error: `Application ${applicationNumber} was created, but the OTP could not be sent: ${otpResult.error}. You can still verify manually from the Review page.`
      }
    }

    return {
      success: {
        applicationId,
        applicationNumber,
        accessToken,
        categorySlug: category.slug,
        mobileNumber
      }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create the test application.' }
  }
}
