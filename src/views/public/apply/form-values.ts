import { z } from 'zod'

import { applicationCommonFieldsSchema, categoryFieldValueSchema } from '@/lib/applications/schema'

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

export const APPLICATION_FORM_DEFAULT_VALUES: ApplicationFormValues = {
  shopOptionId: undefined,
  common: {
    email: '',
    organisationName: '',
    representativeName: '',
    fatherName: '',
    aadhaarNumber: '',
    address: '',
    state: '',
    district: '',
    pinCode: '',
    mobileNumber: '',
    alternateMobile: '',
    workPurpose: '',
    achievementExperience: '',
    remarks: ''
  },
  categoryFields: {}
}
