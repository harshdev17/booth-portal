import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'

import { isValidPan, PAN_ERROR_MESSAGE, PAN_FIELD_KEY } from '@/lib/applications/pan'
import { applicationCommonFieldsSchema, categoryFieldValueSchema } from '@/lib/applications/schema'
import type { CategoryFieldDto } from '@/views/public/apply/types'

/**
 * Client-side form shape for the data-entry page. Mirrors
 * src/lib/applications/schema.ts's applicationSubmissionSchema (minus
 * declaration, which now lives only on the Review page — see
 * ReviewPageView.tsx), purely for immediate UX feedback (required-field
 * highlighting, format hints). The server independently re-validates
 * everything on submit (see src/lib/applications/validate-submission.ts)
 * and never trusts this client-side pass. See .ai/SECURITY.md Section 4.
 */
export const applicationFormSchema = z.object({
  shopOptionId: z.number().int().positive().optional(),
  common: applicationCommonFieldsSchema,
  categoryFields: categoryFieldValueSchema
})

export type ApplicationFormValues = z.input<typeof applicationFormSchema>

/**
 * Resolver for the form: the base schema PLUS checks that depend on more than
 * one field or on the selected category's own field list. These are done
 * here rather than as zod refinements because zod skips object-level
 * refinements whenever any single field already failed — which would hide
 * them until the other errors were fixed. Pressing "Review Application"
 * therefore surfaces EVERY problem in one go (common and category fields).
 */
export function buildFormResolver(fields: CategoryFieldDto[]): Resolver<ApplicationFormValues> {
  const base = zodResolver(applicationFormSchema) as Resolver<ApplicationFormValues>

  return async (values, context, options) => {
    const result = await base(values, context, options)
    const common: Record<string, { type: string; message: string }> = {}
    const category: Record<string, { type: string; message: string }> = {}

    if (values.common.alternateMobile && values.common.alternateMobile === values.common.mobileNumber) {
      common.alternateMobile = { type: 'custom', message: 'Alternate number must be different from your WhatsApp number.' }
    }

    for (const field of fields) {
      const value = (values.categoryFields?.[field.key] ?? '').trim()

      if (!value) {
        if (field.required) category[field.key] = { type: 'custom', message: 'This field is required.' }

        continue
      }

      if (field.key === PAN_FIELD_KEY && !isValidPan(value)) {
        category[field.key] = { type: 'custom', message: PAN_ERROR_MESSAGE }
      } else if (field.maxLength && value.length > field.maxLength) {
        category[field.key] = { type: 'custom', message: `Too long (maximum ${field.maxLength} characters).` }
      }
    }

    if (!Object.keys(common).length && !Object.keys(category).length) return result

    const errors = { ...('errors' in result ? result.errors : {}) } as Record<string, unknown>

    if (Object.keys(common).length) errors.common = { ...((errors.common as object) ?? {}), ...common }
    if (Object.keys(category).length) errors.categoryFields = { ...((errors.categoryFields as object) ?? {}), ...category }

    return { values: {}, errors } as ReturnType<typeof base> extends Promise<infer R> ? R : never
  }
}

export const APPLICATION_FORM_DEFAULT_VALUES: ApplicationFormValues = {
  shopOptionId: undefined,
  common: {
    email: '',
    representativeName: '',
    fatherName: '',
    policeStationName: '',
    policeStationAddress: '',
    aadhaarNumber: '',
    address: '',
    state: '',
    district: '',
    pinCode: '',
    mobileNumber: '',
    alternateMobile: '',
    remarks: ''
  },
  categoryFields: {}
}
