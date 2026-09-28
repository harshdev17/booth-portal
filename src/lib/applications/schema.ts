import { z } from 'zod'

/**
 * Permanently forbidden field keys. No application form, in any category,
 * may ever collect these — per explicit 2026 requirement (the prior-year
 * reference implementation's Brand Promotion category collected several of
 * these; that is exactly the pattern being excluded here).
 *
 * Enforced twice, deliberately: (1) seed data never defines these keys
 * (see migration 0004), and (2) this denylist independently rejects any
 * submission payload containing them, so a future admin misconfiguration
 * of category_field_definitions cannot reintroduce bank-detail collection
 * without a code change to this file.
 */
export const BANNED_FIELD_KEYS = [
  'bank_name',
  'bank',
  'account_holder',
  'account_holder_name',
  'account_number',
  'acc_number',
  'branch_name',
  'branch',
  'ifsc_code',
  'ifsc',
  'swift_code'
] as const

const banned = new Set<string>(BANNED_FIELD_KEYS)

export function isBannedFieldKey(key: string): boolean {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, '_')

  return banned.has(normalized)
}

// --- Common field validation (applies to every category) ---
// Length caps are deliberately strict (defense in depth against oversized
// payloads/DB pressure), independent of any UI-level maxlength.

const email = z.string().trim().min(1).max(191).email()
const shortText = (max: number) => z.string().trim().min(1).max(max)

const optionalShortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(''))
    .transform(v => (v ? v : undefined))

const aadhaarNumber = z
  .string()
  .trim()
  .regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits')

const mobileNumber = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')

const pinCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits')

export const applicationCommonFieldsSchema = z.object({
  email,
  organisationName: shortText(191),
  representativeName: shortText(191),
  fatherName: shortText(191),
  aadhaarNumber,
  address: shortText(512),
  state: shortText(100),
  district: shortText(100),
  pinCode,
  mobileNumber,
  alternateMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .optional()
    .or(z.literal(''))
    .transform(v => (v ? v : undefined)),
  workPurpose: shortText(512),
  achievementExperience: shortText(1024),
  remarks: optionalShortText(1024)
})

export type ApplicationCommonFields = z.infer<typeof applicationCommonFieldsSchema>

// --- Category-specific field value: a flat key/value map, values re-checked
// against the category's live field_definitions server-side (see
// src/lib/applications/validate-submission.ts). This schema only bounds the
// SHAPE of what's acceptable at all (string keys/values, size caps,
// no banned keys) — it does not know category-specific required/optional
// rules, which come from the database at request time.

export const categoryFieldValueSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(64)
      .refine(key => !isBannedFieldKey(key), { message: 'This field is not permitted.' }),
    z.string().trim().max(1024)
  )
  .refine(obj => Object.keys(obj).length <= 25, { message: 'Too many fields submitted.' })

export const declarationSchema = z.object({
  informationCorrect: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm the information is correct.' })
  }),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and conditions.' })
  })
})

/**
 * Full submission payload shape, as received from the client. This is the
 * FIRST validation pass (shape/type/length/format) — it does not yet know
 * which category was selected or what that category actually requires.
 * src/lib/applications/validate-submission.ts performs the second,
 * authoritative pass against live category configuration.
 */
export const applicationSubmissionSchema = z.object({
  categorySlug: z
    .string()
    .trim()
    .min(1)
    .max(191)
    .regex(/^[a-z0-9-]+$/, 'Invalid category'),
  shopOptionId: z.number().int().positive().optional(),
  common: applicationCommonFieldsSchema,
  categoryFields: categoryFieldValueSchema.default({}),
  declaration: declarationSchema
})

export type ApplicationSubmissionInput = z.infer<typeof applicationSubmissionSchema>
