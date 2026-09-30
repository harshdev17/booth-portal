import 'server-only'

import {
  getCategoryBySlug,
  getFieldDefinitionsForCategory,
  getShopOptionsForCategory,
  isCategoryAcceptingApplications,
  type CategoryRow,
  type FieldDefinitionRow,
  type ShopOptionRow
} from '@/lib/applications/categories'
import { isBannedFieldKey, type ApplicationSubmissionInput } from '@/lib/applications/schema'
import { query } from '@/lib/db/client'

export type ValidatedSubmission = {
  category: CategoryRow
  shopOption: ShopOptionRow | null
  fieldValues: Array<{ definition: FieldDefinitionRow; value: string }>
}

export class SubmissionValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'SubmissionValidationError'
  }
}

/**
 * The AUTHORITATIVE validation pass. Re-derives everything from the database
 * using only the category slug from the client — never trusts fee, field
 * requirement, document requirement, or eligibility information the client
 * might have sent alongside it. This is what makes the dynamic category
 * config safe: the frontend's rendering of that config is a UX convenience,
 * this function is the actual security boundary (see
 * .ai/ADMIN_TRANSFORMATION_PLAN.md / .ai/SECURITY.md).
 */
export async function validateSubmissionAgainstCategory(
  input: ApplicationSubmissionInput
): Promise<ValidatedSubmission> {
  const category = await getCategoryBySlug(input.categorySlug)

  if (!category) {
    throw new SubmissionValidationError('The selected category does not exist.', 'category_not_found')
  }

  if (!isCategoryAcceptingApplications(category)) {
    throw new SubmissionValidationError(
      'This category is not currently accepting applications.',
      'category_closed'
    )
  }

  const shopOptions = await getShopOptionsForCategory(category.id)
  let shopOption: ShopOptionRow | null = null

  const shopOptionField = (await getFieldDefinitionsForCategory(category.id)).find(
    f => f.field_key === 'shop_option_id'
  )

  if (shopOptionField) {
    if (input.shopOptionId === undefined) {
      throw new SubmissionValidationError('A shop selection is required for this category.', 'shop_option_required')
    }

    shopOption = shopOptions.find(o => o.id === input.shopOptionId) ?? null

    if (!shopOption) {
      throw new SubmissionValidationError('The selected shop option is invalid.', 'shop_option_invalid')
    }
  } else if (input.shopOptionId !== undefined) {
    // Client sent a shop option for a category that doesn't have one — reject
    // rather than silently ignore, since this indicates either a bug or an
    // attempt to manipulate the submission.
    throw new SubmissionValidationError('This category does not support shop selection.', 'shop_option_unexpected')
  }

  const fieldDefinitions = (await getFieldDefinitionsForCategory(category.id)).filter(
    f => f.field_key !== 'shop_option_id' // handled above, not a generic text/select field here
  )

  const fieldValues: Array<{ definition: FieldDefinitionRow; value: string }> = []

  for (const definition of fieldDefinitions) {
    // Defense in depth: even though seed data never defines a banned key,
    // and the schema layer already rejects banned keys in the payload,
    // refuse to process one here too if it ever appears in configuration.
    if (isBannedFieldKey(definition.field_key)) {
      throw new SubmissionValidationError(
        'This category configuration is invalid and cannot accept submissions.',
        'banned_field_configured'
      )
    }

    const rawValue = input.categoryFields[definition.field_key]

    if (definition.is_required && (rawValue === undefined || rawValue.trim() === '')) {
      throw new SubmissionValidationError(`"${definition.label}" is required.`, 'field_required')
    }

    if (rawValue !== undefined && rawValue.trim() !== '') {
      const maxLength = definition.max_length ?? 1024

      if (rawValue.length > maxLength) {
        throw new SubmissionValidationError(`"${definition.label}" is too long.`, 'field_too_long')
      }

      if (definition.input_type === 'select' || definition.input_type === 'radio') {
        const options = definition.options_json ? (JSON.parse(definition.options_json) as Array<{ value: string }>) : []

        if (!options.some(o => o.value === rawValue)) {
          throw new SubmissionValidationError(`"${definition.label}" has an invalid value.`, 'field_invalid_option')
        }
      }

      fieldValues.push({ definition, value: rawValue })
    }
  }

  // Reject any category field key the client sent that this category does
  // not actually define — never silently accept unexpected fields
  // (mass-assignment protection).
  const knownKeys = new Set(fieldDefinitions.map(f => f.field_key))

  for (const key of Object.keys(input.categoryFields)) {
    if (!knownKeys.has(key)) {
      throw new SubmissionValidationError(`Unexpected field: ${key}`, 'unexpected_field')
    }
  }

  return { category, shopOption, fieldValues }
}

/**
 * Duplicate-application guard, portal-wide (not per-category): one mobile
 * number and one Aadhaar number may each back at most one active
 * application, in ANY category — an applicant cannot hold a second active
 * application under the same mobile number or the same Aadhaar number even
 * if it's for a different category. `aadhaarHash` is the deterministic
 * HMAC(Aadhaar) from aadhaar-crypto.ts, since the stored
 * `aadhaar_ciphertext` is non-deterministic and cannot be used for equality
 * lookups.
 *
 * 'draft' is deliberately excluded from this check, not just 'rejected' /
 * 'cancelled' / 'not_selected'. Every visitor's draft is created on page
 * load with the SAME placeholder mobile number ('9999999999' — see
 * ApplicationFormOrchestrator.tsx) before they've entered anything real.
 * Treating unfinished drafts as duplicates meant the very first visitor to
 * open a category would permanently block every subsequent visitor from
 * ever creating a draft again — a real bug found in testing, not a
 * hypothetical. Only a genuinely SUBMITTED application (status has left
 * 'draft') represents a real duplicate attempt.
 */
export async function hasActiveDuplicateApplication(mobileNumber: string, aadhaarHash: string): Promise<boolean> {
  const rows = await query<Array<{ id: number }>>(
    `SELECT id FROM applications
     WHERE (mobile_number = ? OR aadhaar_hash = ?)
       AND status NOT IN ('draft', 'rejected', 'cancelled', 'not_selected')
     LIMIT 1`,
    [mobileNumber, aadhaarHash]
  )

  return rows.length > 0
}
