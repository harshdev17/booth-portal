import { z } from 'zod'

import { AADHAAR_ERROR_MESSAGE, isValidAadhaar } from '@/lib/applications/aadhaar'

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

// A personal name: letters (any script, incl. Devanagari and its vowel signs),
// spaces and . ' - only — no digits or symbols.
const personName = z
  .string()
  .trim()
  .min(2, 'Enter at least 2 letters.')
  .max(100, 'Too long (maximum 100 characters).')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u, 'Use letters only — no numbers or symbols.')

const placeName = z
  .string()
  .trim()
  .min(2, 'Enter at least 2 letters.')
  .max(100, 'Too long (maximum 100 characters).')
  .regex(/^[\p{L}\p{M}][\p{L}\p{M} .'’()-]*$/u, 'Use letters only — no numbers or symbols.')

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

const email = z
  .string()
  .trim()
  .min(1, 'Email address is required.')
  .max(191, 'Too long (maximum 191 characters).')
  .regex(EMAIL_PATTERN, 'Enter a valid email address, for example name@example.com.')
  .refine(v => !v.includes('..'), { message: 'Enter a valid email address, for example name@example.com.' })
  .transform(v => v.toLowerCase())

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
  .refine(isValidAadhaar, { message: AADHAAR_ERROR_MESSAGE })

const notRepeatedDigit = (v: string) => !/^(\d)\1{9}$/.test(v)

const mobileNumber = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
  .refine(notRepeatedDigit, { message: 'Enter a real mobile number (not the same digit repeated).' })

const pinCode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code (it cannot start with 0).')

export const applicationCommonFieldsSchema = z
  .object({
    email,
    representativeName: personName,
    fatherName: personName,
    aadhaarNumber,
    address: z
      .string()
      .trim()
      .min(10, 'Enter your full address (at least 10 characters).')
      .max(512, 'Too long (maximum 512 characters).'),
    state: placeName,
    district: placeName,
    pinCode,
    mobileNumber,
    alternateMobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
      .refine(notRepeatedDigit, { message: 'Enter a real mobile number (not the same digit repeated).' })
      .optional()
      .or(z.literal(''))
      .transform(v => (v ? v : undefined)),
    remarks: optionalShortText(1024)
  })
  .superRefine((value, ctx) => {
    if (value.alternateMobile && value.alternateMobile === value.mobileNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['alternateMobile'],
        message: 'Alternate number must be different from your WhatsApp number.'
      })
    }
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
