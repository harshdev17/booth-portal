import 'server-only'

import type { z } from 'zod'

import { applicationCommonFieldsSchema, isBannedFieldKey } from '@/lib/applications/schema'
import { isValidPan, normalizePan, PAN_ERROR_MESSAGE, PAN_FIELD_KEY } from '@/lib/applications/pan'
import { query as poolQuery, type TransactionQuery } from '@/lib/db/client'

/**
 * Applications-table fields an admin may raise a query on and the applicant
 * may then correct themselves. Validated with exactly the rules the apply
 * form used. Deliberately excluded: email and mobile_number (identity —
 * the OTP lookup and duplicate-application checks depend on them), Aadhaar
 * (encrypted, uniqueness-checked), and anything that changes category or
 * workflow state. Those still go through the admin Edit dialog.
 */
const common = applicationCommonFieldsSchema.innerType().shape

export const STATIC_QUERYABLE_FIELDS = {
  representative_name: { label: 'Representative Name', labelHi: 'प्रतिनिधि का नाम', schema: common.representativeName },
  father_name: { label: "Father's Name", labelHi: 'पिता का नाम', schema: common.fatherName },
  police_station_name: { label: 'Police Station Name', labelHi: 'पुलिस स्टेशन का नाम', schema: common.policeStationName },
  police_station_address: {
    label: 'Police Station Address',
    labelHi: 'पुलिस स्टेशन का पता',
    schema: common.policeStationAddress
  },
  address: { label: 'Address', labelHi: 'पता', schema: common.address },
  district: { label: 'District', labelHi: 'ज़िला', schema: common.district },
  state: { label: 'State', labelHi: 'राज्य', schema: common.state },
  pin_code: { label: 'PIN Code', labelHi: 'पिन कोड', schema: common.pinCode },
  alternate_mobile: { label: 'Alternate Mobile', labelHi: 'वैकल्पिक मोबाइल', schema: common.alternateMobile }
} as const satisfies Record<string, { label: string; labelHi: string; schema: z.ZodTypeAny }>

export type StaticQueryableField = keyof typeof STATIC_QUERYABLE_FIELDS

export const FIELD_KEY_PATTERN = /^(?:[a-z_]+|dynamic:\d+)$/

export function isStaticQueryableField(key: string): key is StaticQueryableField {
  return Object.prototype.hasOwnProperty.call(STATIC_QUERYABLE_FIELDS, key)
}

type DynamicDefinition = {
  id: number
  field_key: string
  label: string
  label_hi: string | null
  input_type: 'text' | 'textarea' | 'select' | 'radio' | 'multiselect'
  is_required: 0 | 1
  max_length: number | null
  options_json: unknown
}

export type FieldOption = { value: string; label: string }

/** Everything needed to show and validate one queryable field for one application. */
export type ResolvedField = {
  fieldKey: string
  label: string
  labelHi: string | null
  inputType: 'text' | 'textarea' | 'select' | 'radio' | 'multiselect'
  options: FieldOption[]
  maxLength: number
  currentValue: string
  validate: (raw: string) => { ok: true; value: string | null } | { ok: false; error: string }
}

function parseOptions(raw: unknown): FieldOption[] {
  if (!raw) return []

  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw

  return Array.isArray(parsed)
    ? parsed.map((o: { value: string; label?: string }) => ({ value: String(o.value), label: String(o.label ?? o.value) }))
    : []
}

function zodFirstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid value.'
}

/**
 * Resolves a field key against one specific application: confirms the field
 * is queryable and belongs to this application's category, and returns its
 * current value plus a validator. Returns null for anything not queryable
 * (unknown key, excluded identity field, inactive or banned definition).
 */
export async function resolveQueryableField(
  runQuery: TransactionQuery,
  applicationId: number,
  fieldKey: string
): Promise<ResolvedField | null> {
  if (!FIELD_KEY_PATTERN.test(fieldKey)) return null

  if (isStaticQueryableField(fieldKey)) {
    const config = STATIC_QUERYABLE_FIELDS[fieldKey]

    const rows = await runQuery<Array<{ value: string | null; mobile_number: string }>>(
      `SELECT ${fieldKey} AS value, mobile_number FROM applications WHERE id = ? LIMIT 1`,
      [applicationId]
    )

    const row = rows[0]

    if (!row) return null

    return {
      fieldKey,
      label: config.label,
      labelHi: config.labelHi,
      inputType: fieldKey === 'address' || fieldKey === 'police_station_address' ? 'textarea' : 'text',
      options: [],
      maxLength: fieldKey === 'address' || fieldKey === 'police_station_address' ? 512 : 150,
      currentValue: row.value ?? '',
      validate: raw => {
        const result = config.schema.safeParse(raw)

        if (!result.success) return { ok: false, error: zodFirstError(result.error) }

        const value = (result.data as string | undefined) ?? null

        if (fieldKey === 'alternate_mobile' && value && value === row.mobile_number) {
          return { ok: false, error: 'Alternate number must be different from your WhatsApp number.' }
        }

        return { ok: true, value }
      }
    }
  }

  const match = /^dynamic:(\d+)$/.exec(fieldKey)

  if (!match) return null

  const rows = await runQuery<Array<DynamicDefinition & { value: string | null }>>(
    `SELECT cfd.id, cfd.field_key, cfd.label, cfd.label_hi, cfd.input_type, cfd.is_required, cfd.max_length,
            cfd.options_json, afv.value
     FROM applications a
     JOIN category_field_definitions cfd ON cfd.category_id = a.category_id AND cfd.id = ? AND cfd.status = 'active'
     LEFT JOIN application_field_values afv ON afv.application_id = a.id AND afv.field_definition_id = cfd.id
     WHERE a.id = ?
     LIMIT 1`,
    [Number(match[1]), applicationId]
  )

  const definition = rows[0]

  if (!definition || isBannedFieldKey(definition.field_key)) return null

  const options = parseOptions(definition.options_json)
  const maxLength = definition.max_length ?? 1024

  return {
    fieldKey,
    label: definition.label,
    labelHi: definition.label_hi,
    inputType: definition.input_type,
    options,
    maxLength,
    currentValue: definition.value ?? '',
    validate: raw => {
      const value = raw.trim()

      if (value === '') {
        return definition.is_required ? { ok: false, error: `"${definition.label}" is required.` } : { ok: true, value: '' }
      }

      if (value.length > maxLength) return { ok: false, error: `"${definition.label}" is too long.` }

      if (['select', 'radio', 'multiselect'].includes(definition.input_type)) {
        const valid = new Set(options.map(o => o.value))
        const selected = definition.input_type === 'multiselect' ? value.split(',').filter(Boolean) : [value]

        if (selected.length === 0 || !selected.every(v => valid.has(v))) {
          return { ok: false, error: `"${definition.label}" has an invalid value.` }
        }
      }

      if (definition.field_key === PAN_FIELD_KEY) {
        if (!isValidPan(value)) return { ok: false, error: PAN_ERROR_MESSAGE }

        return { ok: true, value: normalizePan(value) }
      }

      return { ok: true, value }
    }
  }
}

/** Writes a validated value to wherever this field lives. */
export async function writeFieldValue(
  runQuery: TransactionQuery,
  applicationId: number,
  fieldKey: string,
  value: string | null
): Promise<void> {
  if (isStaticQueryableField(fieldKey)) {
    await runQuery(`UPDATE applications SET ${fieldKey} = ? WHERE id = ?`, [value, applicationId])

    return
  }

  const fieldDefinitionId = Number(fieldKey.slice('dynamic:'.length))

  await runQuery(
    `INSERT INTO application_field_values (application_id, field_definition_id, value)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [applicationId, fieldDefinitionId, value ?? '']
  )
}

export type FieldQueryRow = {
  id: number
  field_key: string
  field_label: string
  remarks: string
  status: 'open' | 'responded' | 'cancelled'
  previous_value: string | null
  new_value: string | null
  applicant_notes?: string | null
  created_at: string
  responded_at: string | null
}

function isMissingTable(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'ER_NO_SUCH_TABLE'
}

/**
 * Open and responded queries for one application, newest first. Returns []
 * if migration 0080 hasn't been applied yet, so pages keep working (with the
 * feature simply inactive) whichever of code or migration is deployed first.
 */
export async function listFieldQueries(applicationId: number, runQuery: TransactionQuery = poolQuery): Promise<FieldQueryRow[]> {
  try {
    return await runQuery<FieldQueryRow[]>(
      `SELECT id, field_key, field_label, remarks, status, previous_value, new_value, applicant_notes, created_at, responded_at
       FROM application_field_queries
       WHERE application_id = ? AND status IN ('open', 'responded', 'cancelled')
       ORDER BY id DESC
       LIMIT 100`,
      [applicationId]
    )
  } catch (error) {
    if (isMissingTable(error)) return []
    throw error
  }
}

export async function countOpenFieldQueries(applicationId: number, runQuery: TransactionQuery = poolQuery): Promise<number> {
  try {
    const [row] = await runQuery<Array<{ n: number }>>(
      `SELECT COUNT(*) AS n FROM application_field_queries WHERE application_id = ? AND status = 'open'`,
      [applicationId]
    )

    return Number(row?.n ?? 0)
  } catch (error) {
    if (isMissingTable(error)) return 0
    throw error
  }
}

/** Shape sent to the applicant for each open query — only what the edit form needs. */
export type ApplicantFieldQuery = {
  id: number
  fieldKey: string
  label: string
  labelHi: string | null
  remarks: string
  inputType: ResolvedField['inputType']
  options: FieldOption[]
  maxLength: number
  currentValue: string
  createdAt: string
}

export type ApplicantFieldQueryTrail = {
  id: number
  fieldKey: string
  label: string
  labelHi: string | null
  remarks: string
  status: 'open' | 'responded'
  previousValue: string | null
  newValue: string | null
  applicantNotes: string | null
  createdAt: string
  respondedAt: string | null
}

export async function listApplicantFieldQueryTrail(applicationId: number): Promise<ApplicantFieldQueryTrail[]> {
  const all = await listFieldQueries(applicationId)

  return all
    .filter(q => q.status === 'open' || q.status === 'responded')
    .map(q => {
      const staticField = isStaticQueryableField(q.field_key) ? STATIC_QUERYABLE_FIELDS[q.field_key] : null

      return {
        id: q.id,
        fieldKey: q.field_key,
        label: q.field_label,
        labelHi: staticField?.labelHi ?? null,
        remarks: q.remarks,
        status: q.status as 'open' | 'responded',
        previousValue: q.previous_value,
        newValue: q.new_value,
        applicantNotes: q.applicant_notes ?? null,
        createdAt: q.created_at,
        respondedAt: q.responded_at
      }
    })
}

export async function getApplicantFieldQueries(applicationId: number): Promise<ApplicantFieldQuery[]> {
  const open = (await listFieldQueries(applicationId)).filter(q => q.status === 'open')
  const result: ApplicantFieldQuery[] = []

  for (const q of open) {
    const field = await resolveQueryableField(poolQuery, applicationId, q.field_key)

    if (!field) continue

    result.push({
      id: q.id,
      fieldKey: q.field_key,
      label: field.label,
      labelHi: field.labelHi,
      remarks: q.remarks,
      inputType: field.inputType,
      options: field.options,
      maxLength: field.maxLength,
      currentValue: field.currentValue,
      createdAt: q.created_at
    })
  }

  return result
}
