import 'server-only'

import { query } from '@/lib/db/client'

export type ApprovalChecklistField = { key: string; label: string; checked: boolean }

export type ApprovalChecklist = {
  status: string
  allDocumentsVerified: boolean
  missingDocumentLabels: string[]
  fields: ApprovalChecklistField[]
}

// Mirrors the field rows rendered on the Application Detail page
// (src/app/(admin)/admin/applications/[id]/page.tsx) — kept as a separate
// list here (rather than refactoring that page to share it) because this
// list only needs key+label, not each field's current value.
const STATIC_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'representative_name', label: 'Representative Name' },
  { key: 'father_name', label: "Father's Name" },
  { key: 'organisation_name', label: 'Organisation / Firm Name' },
  { key: 'aadhaar_number', label: 'Aadhaar Number' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'Mobile Number' },
  { key: 'alternate_mobile', label: 'Alternate Mobile' },
  { key: 'pin_code', label: 'PIN Code' },
  { key: 'address', label: 'Address' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'category', label: 'Category' },
  { key: 'selection_method', label: 'Selection Method' },
  { key: 'shop_option', label: 'Booth/Stall Option' },
  { key: 'submitted_at', label: 'Submitted At' },
  { key: 'work_purpose', label: 'Purpose of Work' },
  { key: 'achievement_experience', label: 'Achievements / Experience' }
]

/**
 * What an admin must see before approving an application: whether every
 * required document is verified (the hard gate — approval is blocked while
 * this is false), and the full list of application fields with their
 * current "data verified correct" checkmark (see migration 0020 /
 * application_field_checks). Approving marks every field in this list as
 * checked, in one step, instead of requiring each to be ticked individually
 * on the detail page first.
 */
export async function getApprovalChecklist(applicationId: number): Promise<ApprovalChecklist | null> {
  const rows = await query<Array<{ id: number; status: string; category_id: number; remarks: string | null }>>(
    `SELECT id, status, category_id, remarks FROM applications WHERE id = ? LIMIT 1`,
    [applicationId]
  )

  const app = rows[0]

  if (!app) return null

  const [missingDocs, dynamicFields, checkedRows] = await Promise.all([
    query<Array<{ label: string }>>(
      `SELECT cdd.label
       FROM category_document_definitions cdd
       LEFT JOIN application_documents ad
         ON ad.document_definition_id = cdd.id AND ad.application_id = ?
       WHERE cdd.category_id = ? AND cdd.is_required = 1 AND cdd.status = 'active'
         AND (ad.id IS NULL OR ad.verification_status != 'verified')
       ORDER BY cdd.display_order ASC`,
      [applicationId, app.category_id]
    ),
    query<Array<{ field_definition_id: number; label: string }>>(
      `SELECT cfd.id AS field_definition_id, cfd.label
       FROM application_field_values afv
       JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
       WHERE afv.application_id = ?
       ORDER BY cfd.display_order ASC`,
      [applicationId]
    ),
    query<Array<{ field_key: string }>>(`SELECT field_key FROM application_field_checks WHERE application_id = ?`, [
      applicationId
    ])
  ])

  const checkedKeys = new Set(checkedRows.map(r => r.field_key))

  const fieldDefinitions: Array<{ key: string; label: string }> = [
    ...STATIC_FIELDS,
    ...(app.remarks ? [{ key: 'remarks', label: 'Applicant Remarks' }] : []),
    ...dynamicFields.map(f => ({ key: `dynamic:${f.field_definition_id}`, label: f.label }))
  ]

  return {
    status: app.status,
    allDocumentsVerified: missingDocs.length === 0,
    missingDocumentLabels: missingDocs.map(d => d.label),
    fields: fieldDefinitions.map(f => ({ ...f, checked: checkedKeys.has(f.key) }))
  }
}
