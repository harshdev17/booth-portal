import 'server-only'

import { query, type TransactionQuery } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'

export type ApprovalChecklistField = { key: string; label: string; checked: boolean; value: string }

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
  { key: 'police_station_name', label: 'Police Station Name' },
  { key: 'police_station_address', label: 'Police Station Address' },
  { key: 'aadhaar_number', label: 'Aadhaar Number' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'WhatsApp Number' },
  { key: 'alternate_mobile', label: 'Alternate Mobile' },
  { key: 'pin_code', label: 'PIN Code' },
  { key: 'address', label: 'Address' },
  { key: 'district', label: 'District' },
  { key: 'state', label: 'State' },
  { key: 'category', label: 'Category' },
  { key: 'selection_method', label: 'Selection Method' },
  { key: 'shop_option', label: 'Booth/Stall Option' },
  { key: 'submitted_at', label: 'Submitted At' }
]

// Older applications also carry these (no longer asked on new ones — stored empty).
const LEGACY_FIELDS: Array<{ key: 'organisation_name' | 'work_purpose' | 'achievement_experience'; label: string }> = [
  { key: 'organisation_name', label: 'Organisation / Firm Name' },
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
 *
 * Takes an optional connection-scoped query function (see
 * withPooledConnection() in client.ts) so a caller that's already fanning
 * out several other queries of its own — the application detail page — can
 * run this checklist's queries on that same shared connection instead of
 * checking out yet another one from the pool. Callers that don't pass one
 * (the approve/bulk-approve routes) keep using the default pool-backed
 * query(), unchanged.
 */
export async function getApprovalChecklist(
  applicationId: number,
  runQuery: TransactionQuery = query
): Promise<ApprovalChecklist | null> {
  const rows = await runQuery<
    Array<{
      id: number
      status: string
      category_id: number
      remarks: string | null
      organisation_name: string | null
      work_purpose: string | null
      achievement_experience: string | null
      representative_name: string
      father_name: string
      police_station_name: string
      police_station_address: string
      aadhaar_ciphertext: Buffer
      email: string
      mobile_number: string
      alternate_mobile: string | null
      pin_code: string
      address: string
      district: string
      state: string
      submitted_at: string | null
    }>
  >(
    `SELECT a.id, a.status, a.category_id, a.remarks, a.organisation_name, a.work_purpose, a.achievement_experience,
            a.representative_name, a.father_name, a.police_station_name, a.police_station_address,
            a.aadhaar_ciphertext, a.email, a.mobile_number, a.alternate_mobile, a.pin_code, a.address,
            a.district, a.state, a.submitted_at
     FROM applications a WHERE a.id = ? LIMIT 1`,
    [applicationId]
  )

  const app = rows[0]

  if (!app) return null

  // Sequential on the same connection (runQuery), not Promise.all — when
  // called with a shared connection (see withPooledConnection in client.ts),
  // concurrent queries on one mysql2 connection aren't safe. When called
  // with the default pool-backed query() (the approve/bulk-approve routes),
  // this is slightly slower than running them in parallel, but those routes
  // run once per approval action, not on every page load, so the trade-off
  // favors not adding yet another fan-out point.
  const missingDocs = await runQuery<Array<{ label: string }>>(
    `SELECT cdd.label
     FROM category_document_definitions cdd
     LEFT JOIN application_documents ad
       ON ad.document_definition_id = cdd.id AND ad.application_id = ?
     WHERE cdd.category_id = ? AND cdd.is_required = 1 AND cdd.status = 'active'
       AND (ad.id IS NULL OR ad.verification_status != 'verified')
     ORDER BY cdd.display_order ASC`,
    [applicationId, app.category_id]
  )

  const categoryRow = await runQuery<Array<{ name: string; selection_method: string }>>(
    `SELECT name, selection_method FROM categories WHERE id = ? LIMIT 1`,
    [app.category_id]
  )

  const dynamicFields = await runQuery<Array<{ field_definition_id: number; label: string; value: string }>>(
    `SELECT cfd.id AS field_definition_id, cfd.label, afv.value
     FROM application_field_values afv
     JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
     WHERE afv.application_id = ?
     ORDER BY cfd.display_order ASC`,
    [applicationId]
  )

  const checkedRows = await runQuery<Array<{ field_key: string }>>(
    `SELECT field_key FROM application_field_checks WHERE application_id = ?`,
    [applicationId]
  )

  const checkedKeys = new Set(checkedRows.map(r => r.field_key))
  const category = categoryRow[0]
  const aadhaarNumber = decryptAadhaar(Buffer.from(app.aadhaar_ciphertext))

  // Values for STATIC_FIELDS, keyed the same as their `key` — kept as a
  // lookup rather than reshaping STATIC_FIELDS itself so that list stays
  // the single source of truth for which fields exist/their order.
  const staticValues: Record<string, string> = {
    representative_name: app.representative_name,
    father_name: app.father_name,
    police_station_name: app.police_station_name,
    police_station_address: app.police_station_address,
    aadhaar_number: `${aadhaarNumber.slice(0, 4)}-${aadhaarNumber.slice(4, 8)}-${aadhaarNumber.slice(8, 12)}`,
    email: app.email,
    mobile_number: app.mobile_number,
    alternate_mobile: app.alternate_mobile || '—',
    pin_code: app.pin_code,
    address: app.address,
    district: app.district,
    state: app.state,
    category: category?.name ?? '—',
    selection_method: category?.selection_method ?? '—',
    shop_option: '—', // Not resolved here — the detail page's own field row shows this; not critical for the approval checklist's quick glance.
    submitted_at: app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-IN') : '—'
  }

  const fieldDefinitions: Array<{ key: string; label: string; value: string }> = [
    ...STATIC_FIELDS.map(f => ({ ...f, value: staticValues[f.key] ?? '—' })),
    ...LEGACY_FIELDS.filter(f => !!app[f.key]).map(f => ({ ...f, value: app[f.key] as string })),
    ...(app.remarks ? [{ key: 'remarks', label: 'Applicant Remarks', value: app.remarks }] : []),
    ...dynamicFields.map(f => ({ key: `dynamic:${f.field_definition_id}`, label: f.label, value: f.value }))
  ]

  return {
    status: app.status,
    allDocumentsVerified: missingDocs.length === 0,
    missingDocumentLabels: missingDocs.map(d => d.label),
    fields: fieldDefinitions.map(f => ({ ...f, checked: checkedKeys.has(f.key) }))
  }
}
