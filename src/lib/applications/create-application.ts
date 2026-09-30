import 'server-only'

import { aadhaarLast4, encryptAadhaar, hashAadhaar } from '@/lib/applications/aadhaar-crypto'
import { generateAccessToken, hashAccessToken, verifyAccessToken } from '@/lib/applications/access-token'
import { generateApplicationNumber } from '@/lib/applications/application-number'
import { getCategoryById, getDocumentDefinitionsForCategory, isCategoryAcceptingApplications } from '@/lib/applications/categories'
import type { ApplicationSubmissionInput } from '@/lib/applications/schema'
import { hasActiveDuplicateApplication, type ValidatedSubmission } from '@/lib/applications/validate-submission'
import { logAudit } from '@/lib/audit/log'
import { query, withTransaction, type TransactionQuery } from '@/lib/db/client'
import { hasRecentVerifiedOtp } from '@/lib/notifications/otp'

export type CreateDraftResult = {
  applicationId: number
  applicationNumber: string
  accessToken: string
}

export class DuplicateApplicationError extends Error {
  constructor() {
    super('An application already exists using this mobile number or Aadhaar number. Only one application is allowed per mobile number and per Aadhaar number. Please check your application status, or contact support if you believe this is an error.')
    this.name = 'DuplicateApplicationError'
  }
}

export class ApplicationStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApplicationStateError'
  }
}

async function insertApplicationNumberWithRetry(
  txQuery: TransactionQuery,
  buildInsert: (applicationNumber: string) => Promise<{ insertId: number }>
): Promise<{ insertId: number; applicationNumber: string }> {
  const year = new Date().getFullYear()
  const maxAttempts = 5

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const applicationNumber = generateApplicationNumber(year)

    try {
      const result = await buildInsert(applicationNumber)

      return { insertId: result.insertId, applicationNumber }
    } catch (error) {
      // ER_DUP_ENTRY on the application_number unique key — vanishingly rare
      // given the randomness space, but retried rather than assumed away.
      const mysqlError = error as { code?: string }

      if (mysqlError.code === 'ER_DUP_ENTRY' && attempt < maxAttempts - 1) continue
      throw error
    }
  }

  throw new Error('Failed to generate a unique application number after multiple attempts.')
}

/**
 * Creates a DRAFT application (status='draft') inside a single DB
 * transaction — the application row, its category-specific field values,
 * and an audit log entry all commit together or not at all (see
 * .ai/SECURITY.md "DB transaction for final application creation"). This is
 * the step that hands the client an application id + access token so it can
 * then upload documents (see src/app/api/applications/[id]/documents/route.ts)
 * before the applicant confirms and finalizes on the Review step (see
 * finalizeApplication below) — sequencing decided per .ai/DECISIONS.md-style
 * interim ownership approach (no OTP yet).
 *
 * Duplicate-application check here is a first pass for early UX feedback;
 * finalizeApplication() re-checks it again as the authoritative gate, since
 * a duplicate could be created by a second draft between this check and
 * finalization (see finalizeApplication's own comment on this).
 */
export async function createDraftApplication(
  input: ApplicationSubmissionInput,
  validated: ValidatedSubmission,
  meta: { ipAddress?: string }
): Promise<CreateDraftResult> {
  const aadhaarHash = hashAadhaar(input.common.aadhaarNumber)
  const isDuplicate = await hasActiveDuplicateApplication(input.common.mobileNumber, aadhaarHash)

  if (isDuplicate) {
    throw new DuplicateApplicationError()
  }

  const accessToken = generateAccessToken()
  const accessTokenHash = hashAccessToken(accessToken)
  const aadhaarCiphertext = encryptAadhaar(input.common.aadhaarNumber)
  const last4 = aadhaarLast4(input.common.aadhaarNumber)

  const { insertId: applicationId, applicationNumber } = await withTransaction(async txQuery => {
    const { insertId, applicationNumber } = await insertApplicationNumberWithRetry(txQuery, async candidateNumber => {
      const result = await txQuery<{ insertId: number }>(
        `INSERT INTO applications (
           application_number, category_id, shop_option_id,
           email, organisation_name, representative_name, father_name,
           aadhaar_ciphertext, aadhaar_last4, aadhaar_hash,
           address, state, district, pin_code, mobile_number, alternate_mobile,
           work_purpose, achievement_experience, remarks,
           status, access_token_hash, ip_address
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
        [
          candidateNumber,
          validated.category.id,
          validated.shopOption?.id ?? null,
          input.common.email,
          input.common.organisationName,
          input.common.representativeName,
          input.common.fatherName,
          aadhaarCiphertext,
          last4,
          aadhaarHash,
          input.common.address,
          input.common.state,
          input.common.district,
          input.common.pinCode,
          input.common.mobileNumber,
          input.common.alternateMobile ?? null,
          input.common.workPurpose,
          input.common.achievementExperience,
          input.common.remarks ?? null,
          accessTokenHash,
          meta.ipAddress ?? null
        ]
      )

      return result
    })

    for (const { definition, value } of validated.fieldValues) {
      await txQuery(
        `INSERT INTO application_field_values (application_id, field_definition_id, value) VALUES (?, ?, ?)`,
        [insertId, definition.id, value]
      )
    }

    await txQuery(
      `INSERT INTO audit_logs (actor_user_id, actor_role_key, action, module, entity_type, entity_id, ip_address)
       VALUES (NULL, NULL, 'application.draft_created', 'applications', 'application', ?, ?)`,
      [String(insertId), meta.ipAddress ?? null]
    )

    return { insertId, applicationNumber }
  })

  return { applicationId, applicationNumber, accessToken }
}

type OwnedDraftRow = {
  id: number
  status: string
  access_token_hash: string
}

/**
 * Ownership/state check for a draft application, independent of any
 * category-specific validation. Callers (API routes) must run this BEFORE
 * doing any work that depends on the request body — e.g. re-validating
 * category configuration — so an unauthenticated or out-of-state request
 * never causes business logic to execute first. See CLAUDE.md Section 15
 * ("frontend must never be trusted for authorization") and
 * .ai/SECURITY.md Section 2 (authorization checked before other logic).
 */
export async function assertOwnsEditableDraft(applicationId: number, accessToken: string): Promise<void> {
  const rows = await query<OwnedDraftRow[]>(
    `SELECT id, status, access_token_hash FROM applications WHERE id = ? LIMIT 1`,
    [applicationId]
  )

  const application = rows[0]

  if (!application) {
    throw new ApplicationStateError('Application not found.')
  }

  if (!verifyAccessToken(accessToken, application.access_token_hash)) {
    throw new ApplicationStateError('Not authorized.')
  }

  if (application.status !== 'draft') {
    throw new ApplicationStateError('This application can no longer be edited.')
  }
}

/**
 * Overwrites a draft application's data with real applicant-entered values.
 * Used by the single-page form: a placeholder draft is created on page load
 * purely so document uploads have an application id to attach to (see
 * createDraftApplication above), then this call replaces those placeholder
 * values with what the applicant actually typed, immediately before
 * finalizeApplication() is called. Callers must call
 * assertOwnsEditableDraft() first — this function does not repeat that
 * check, to avoid a redundant query in the common case where the caller
 * already did it before running category validation.
 */
export async function updateDraftApplication(
  applicationId: number,
  input: ApplicationSubmissionInput,
  validated: ValidatedSubmission
): Promise<void> {
  const aadhaarCiphertext = encryptAadhaar(input.common.aadhaarNumber)
  const last4 = aadhaarLast4(input.common.aadhaarNumber)
  const aadhaarHash = hashAadhaar(input.common.aadhaarNumber)

  await withTransaction(async txQuery => {
    await txQuery(
      `UPDATE applications SET
         category_id = ?, shop_option_id = ?,
         email = ?, organisation_name = ?, representative_name = ?, father_name = ?,
         aadhaar_ciphertext = ?, aadhaar_last4 = ?, aadhaar_hash = ?,
         address = ?, state = ?, district = ?, pin_code = ?, mobile_number = ?, alternate_mobile = ?,
         work_purpose = ?, achievement_experience = ?, remarks = ?
       WHERE id = ? AND status = 'draft'`,
      [
        validated.category.id,
        validated.shopOption?.id ?? null,
        input.common.email,
        input.common.organisationName,
        input.common.representativeName,
        input.common.fatherName,
        aadhaarCiphertext,
        last4,
        aadhaarHash,
        input.common.address,
        input.common.state,
        input.common.district,
        input.common.pinCode,
        input.common.mobileNumber,
        input.common.alternateMobile ?? null,
        input.common.workPurpose,
        input.common.achievementExperience,
        input.common.remarks ?? null,
        applicationId
      ]
    )

    await txQuery(`DELETE FROM application_field_values WHERE application_id = ?`, [applicationId])

    for (const { definition, value } of validated.fieldValues) {
      await txQuery(
        `INSERT INTO application_field_values (application_id, field_definition_id, value) VALUES (?, ?, ?)`,
        [applicationId, definition.id, value]
      )
    }
  })
}

type FinalizeRow = {
  id: number
  category_id: number
  status: string
  access_token_hash: string
  mobile_number: string
  aadhaar_hash: string | null
}

/**
 * Transitions a draft application to 'payment_pending' after the applicant
 * confirms the Review step's declaration. Re-validates, at this final
 * moment: (1) ownership via access token, (2) the application is still in
 * 'draft' status (never re-finalize an already-submitted application), (3)
 * the category is still accepting applications (it may have closed while
 * the applicant was filling the form), (4) no OTHER application has since
 * become an active duplicate for this mobile number or Aadhaar number
 * (portal-wide, not per-category). All of this plus the status update and
 * audit log happen in one transaction — this IS the "DB transaction for
 * final application creation" boundary.
 */
export async function finalizeApplication(
  applicationId: number,
  accessToken: string,
  meta: { ipAddress?: string }
): Promise<{
  applicationNumber: string
  feePaise: number | null
  feeBasePaise: number | null
  gstPercent: number | null
}> {
  const rows = await query<Array<FinalizeRow & { application_number: string }>>(
    `SELECT id, category_id, status, access_token_hash, mobile_number, aadhaar_hash, application_number
     FROM applications WHERE id = ? LIMIT 1`,
    [applicationId]
  )

  const application = rows[0]

  if (!application) {
    throw new ApplicationStateError('Application not found.')
  }

  if (!verifyAccessToken(accessToken, application.access_token_hash)) {
    throw new ApplicationStateError('Not authorized.')
  }

  if (application.status !== 'draft') {
    throw new ApplicationStateError('This application has already been submitted.')
  }

  // Explicit requirement: mobile number must be OTP-verified before an
  // application can be finalized, not just at status-lookup time. The
  // client is expected to have already run /api/otp/request + /api/otp/verify
  // for this number on the Review page — this is the server-side gate that
  // actually enforces it, since client state alone is never trusted for
  // authorization (see .ai/SECURITY.md).
  const mobileVerified = await hasRecentVerifiedOtp(`+91${application.mobile_number}`, 'applicant_mobile_verification', 30)

  if (!mobileVerified) {
    throw new ApplicationStateError('Please verify your mobile number with the OTP sent to it before submitting.')
  }

  const category = await getCategoryById(application.category_id)

  if (!category || !isCategoryAcceptingApplications(category)) {
    throw new ApplicationStateError('This category is no longer accepting applications.')
  }

  const isDuplicateNow = await hasActiveDuplicateApplicationExcluding(
    application.mobile_number,
    application.aadhaar_hash,
    applicationId
  )

  if (isDuplicateNow) {
    throw new DuplicateApplicationError()
  }

  const missingDocument = await findMissingRequiredDocument(applicationId, application.category_id)

  if (missingDocument) {
    throw new ApplicationStateError(`Required document missing: ${missingDocument}`)
  }

  await withTransaction(async txQuery => {
    await txQuery(
      `UPDATE applications SET status = 'payment_pending', declaration_accepted_at = NOW(), submitted_at = NOW()
       WHERE id = ? AND status = 'draft'`,
      [applicationId]
    )

    await txQuery(
      `INSERT INTO audit_logs (actor_user_id, actor_role_key, action, module, entity_type, entity_id, ip_address)
       VALUES (NULL, NULL, 'application.submitted', 'applications', 'application', ?, ?)`,
      [String(applicationId), meta.ipAddress ?? null]
    )
  })

  return {
    applicationNumber: application.application_number,
    feePaise: category.fee_paise,
    feeBasePaise: category.fee_base_paise,
    gstPercent: category.gst_percent ? Number(category.gst_percent) : null
  }
}

async function hasActiveDuplicateApplicationExcluding(
  mobileNumber: string,
  aadhaarHash: string | null,
  excludeApplicationId: number
): Promise<boolean> {
  const rows = await query<Array<{ id: number }>>(
    `SELECT id FROM applications
     WHERE (mobile_number = ? OR (aadhaar_hash IS NOT NULL AND aadhaar_hash = ?)) AND id != ?
       AND status NOT IN ('draft', 'rejected', 'cancelled', 'not_selected')
     LIMIT 1`,
    [mobileNumber, aadhaarHash, excludeApplicationId]
  )

  return rows.length > 0
}

/**
 * Server-side check that every required document for the category has been
 * uploaded before finalize is allowed to proceed. The frontend also disables
 * the Submit button until required documents are uploaded, but that is a UX
 * convenience only — this check is the actual security/business-rule
 * boundary (see .ai/SECURITY.md, CLAUDE.md Section 15: never trust the
 * client for authorization or business-rule enforcement).
 */
async function findMissingRequiredDocument(applicationId: number, categoryId: number): Promise<string | null> {
  const requiredDocs = (await getDocumentDefinitionsForCategory(categoryId)).filter(d => d.is_required)

  if (requiredDocs.length === 0) return null

  const uploadedRows = await query<Array<{ document_definition_id: number }>>(
    `SELECT document_definition_id FROM application_documents WHERE application_id = ?`,
    [applicationId]
  )

  const uploadedIds = new Set(uploadedRows.map(r => r.document_definition_id))

  const missing = requiredDocs.find(d => !uploadedIds.has(d.id))

  return missing ? missing.label : null
}

/** Re-exported for API route error handling — kept alongside its usage site. */
export { logAudit }
