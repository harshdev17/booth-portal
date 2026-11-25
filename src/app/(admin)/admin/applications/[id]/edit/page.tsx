import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId, encodeId } from '@/lib/security/opaque-id'
import EditApplicationForm, {
  type EditCategoryFieldItem,
  type EditCategoryOption
} from '@/views/admin/applications/EditApplicationForm'

export const metadata: Metadata = {
  title: 'Edit Application — IGM Admin Portal'
}

type ApplicationRow = {
  id: number
  application_number: string
  status: string
  category_id: number
  email: string
  organisation_name: string | null
  representative_name: string
  father_name: string
  police_station_name: string
  police_station_address: string
  address: string
  state: string
  district: string
  pin_code: string
  mobile_number: string
  alternate_mobile: string | null
  work_purpose: string | null
  achievement_experience: string | null
  remarks: string | null
}

// Statuses where a category swap leaves no stale fee/stall/payment state
// behind — past this point, the application already has records (a seeded
// payment, an allotted stall) tied to the OLD category that a swap doesn't
// automatically reconcile. Category change is still ALLOWED in every status
// per explicit request (2026-11-25): "koi bhi status ho change ho paaye" —
// this list only drives the warning banner shown for the riskier case, not
// a block (see api/admin/applications/[id]/edit/route.ts, which no longer
// restricts this server-side either).
const CATEGORY_CHANGE_SAFE_STATUSES = ['under_review', 'payment_success', 'query_raised']

const EditApplicationPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  await requirePermission('application:edit')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) notFound()

  const rows = await query<ApplicationRow[]>(
    `SELECT id, application_number, status, category_id, email, organisation_name, representative_name, father_name,
            police_station_name, police_station_address, address, state, district, pin_code, mobile_number,
            alternate_mobile, work_purpose, achievement_experience, remarks
     FROM applications WHERE id = ? LIMIT 1`,
    [applicationId]
  )

  const app = rows[0]

  if (!app) notFound()

  // Every ACTIVE field definition for this application's category, left
  // joined with whatever value is already saved — unlike the admin detail
  // page's own query (application_field_values INNER JOIN, which silently
  // omits a field the applicant left blank), this must show every field the
  // category defines so the admin can fill in one that was missed, not just
  // correct ones already answered.
  const categoryFieldRows = await query<
    Array<{
      field_definition_id: number
      field_key: string
      label: string
      label_hi: string | null
      section: string | null
      section_hi: string | null
      input_type: string
      is_required: number
      max_length: number | null
      options_json: string | Array<{ value: string; label: string }> | null
      value: string | null
    }>
  >(
    `SELECT cfd.id AS field_definition_id, cfd.field_key, cfd.label, cfd.label_hi, cfd.section, cfd.section_hi,
            cfd.input_type, cfd.is_required, cfd.max_length, cfd.options_json, afv.value
     FROM category_field_definitions cfd
     LEFT JOIN application_field_values afv ON afv.field_definition_id = cfd.id AND afv.application_id = ?
     WHERE cfd.category_id = ? AND cfd.status = 'active' AND cfd.field_key != 'shop_option_id'
     ORDER BY cfd.display_order ASC`,
    [applicationId, app.category_id]
  )

  const categoryFields: EditCategoryFieldItem[] = categoryFieldRows.map(f => ({
    fieldDefinitionId: f.field_definition_id,
    key: f.field_key,
    label: f.label,
    labelHi: f.label_hi,
    section: f.section,
    sectionHi: f.section_hi,
    inputType: f.input_type as EditCategoryFieldItem['inputType'],
    required: Boolean(f.is_required),
    maxLength: f.max_length,
    options: f.options_json
      ? ((typeof f.options_json === 'string' ? JSON.parse(f.options_json) : f.options_json) as Array<{
          value: string
          label: string
        }>)
      : undefined,
    value: f.value ?? ''
  }))

  const categoryRows = await query<Array<{ id: number; name: string }>>(
    `SELECT id, name FROM categories WHERE status != 'archived' ORDER BY name ASC`
  )

  const categories: EditCategoryOption[] = categoryRows.map(c => ({ id: c.id, name: c.name }))

  const categoryChangeIsRisky = !CATEGORY_CHANGE_SAFE_STATUSES.includes(app.status)

  return (
    <div className='kdb-form-scale'>
      <EditApplicationForm
        applicationId={id}
        applicationNumber={app.application_number}
        currentCategoryId={app.category_id}
        currentStatus={app.status}
        categoryChangeIsRisky={categoryChangeIsRisky}
        categories={categories}
        categoryFields={categoryFields}
        common={{
          email: app.email,
          organisationName: app.organisation_name ?? '',
          representativeName: app.representative_name,
          fatherName: app.father_name,
          policeStationName: app.police_station_name,
          policeStationAddress: app.police_station_address,
          address: app.address,
          state: app.state,
          district: app.district,
          pinCode: app.pin_code,
          mobileNumber: app.mobile_number,
          alternateMobile: app.alternate_mobile ?? '',
          workPurpose: app.work_purpose ?? '',
          achievementExperience: app.achievement_experience ?? '',
          remarks: app.remarks ?? ''
        }}
        backHref={`/admin/applications/${encodeId(app.id)}`}
      />
    </div>
  )
}

export default EditApplicationPage
