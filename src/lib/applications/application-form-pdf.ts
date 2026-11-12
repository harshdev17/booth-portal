import 'server-only'

import { query } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { renderApplicationPdf } from '@/lib/pdf/react-templates'

type ApplicationRow = {
  id: number
  application_number: string
  status: string
  mobile_number: string
  alternate_mobile: string | null
  email: string
  organisation_name: string
  representative_name: string
  father_name: string
  police_station_name: string
  police_station_address: string
  aadhaar_ciphertext: Buffer
  address: string
  state: string
  district: string
  pin_code: string
  work_purpose: string
  achievement_experience: string
  remarks: string | null
  submitted_at: string | null
  created_at: string
  category_name: string
  category_name_hi: string | null
  shop_option_label: string | null
  fee_paise: number | null
  registration_payment_status: string | null
  registration_amount_paise: number | null
  registration_payment_id: string | null
  registration_paid_at: string | null
  allotment_payment_status: string | null
}

/**
 * Shared by the single-application "Application Form" download
 * (api/admin/applications/[id]/summary/pdf) and the "Download All" ZIP
 * (api/admin/applications/[id]/download-all) — both need the exact same PDF,
 * pulled out here so the DB fetch + render logic exists in only one place.
 * Returns null if the application itself doesn't exist.
 */
export async function buildApplicationFormPdf(
  applicationId: number
): Promise<{ buffer: Buffer; applicationNumber: string } | null> {
  const rows = await query<ApplicationRow[]>(
    `SELECT a.id, a.application_number, a.status, a.mobile_number, a.alternate_mobile, a.email,
            a.organisation_name, a.representative_name, a.father_name,
            a.police_station_name, a.police_station_address, a.aadhaar_ciphertext,
            a.address, a.state, a.district, a.pin_code, a.work_purpose, a.achievement_experience,
            a.remarks, a.submitted_at, a.created_at,
            c.name AS category_name, c.name_hi AS category_name_hi, c.fee_paise,
            cso.label AS shop_option_label,
            reg_p.status AS registration_payment_status,
            reg_p.amount_paise AS registration_amount_paise,
            (SELECT pt.razorpay_payment_id FROM payment_transactions pt
              WHERE pt.payment_id = reg_p.id AND pt.razorpay_payment_id IS NOT NULL
              ORDER BY pt.created_at DESC LIMIT 1) AS registration_payment_id,
            (SELECT pt.created_at FROM payment_transactions pt
              WHERE pt.payment_id = reg_p.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
              ORDER BY pt.created_at DESC LIMIT 1) AS registration_paid_at,
            p.status AS allotment_payment_status
     FROM applications a
     JOIN categories c ON c.id = a.category_id
     LEFT JOIN category_shop_options cso ON cso.id = a.shop_option_id
     LEFT JOIN payments reg_p ON reg_p.application_id = a.id AND reg_p.purpose = 'registration'
     LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'pay_now'
     WHERE a.id = ?
     LIMIT 1`,
    [applicationId]
  )

  const application = rows[0]

  if (!application) return null

  const fieldValues = await query<Array<{ label: string; labelHi: string | null; value: string }>>(
    `SELECT cfd.label, cfd.label_hi AS labelHi, afv.value
     FROM application_field_values afv
     JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
     WHERE afv.application_id = ?
     ORDER BY cfd.display_order ASC`,
    [application.id]
  )

  const aadhaarNumber = decryptAadhaar(application.aadhaar_ciphertext)
  const mobileNumber = `+91${application.mobile_number}`
  const alternateMobile = application.alternate_mobile ? `+91${application.alternate_mobile}` : null

  const buffer = await renderApplicationPdf({
    applicationNumber: application.application_number,
    status: application.status,
    categoryName: application.category_name,
    shopOptionLabel: application.shop_option_label,
    feePaise: application.fee_paise,
    submittedAt: application.submitted_at,
    organisationName: application.organisation_name,
    representativeName: application.representative_name,
    fatherName: application.father_name,
    policeStationName: application.police_station_name,
    policeStationAddress: application.police_station_address,
    aadhaarNumber,
    email: application.email,
    mobileNumber,
    alternateMobile,
    address: application.address,
    state: application.state,
    district: application.district,
    pinCode: application.pin_code,
    workPurpose: application.work_purpose,
    achievementExperience: application.achievement_experience,
    remarks: application.remarks,
    fieldValues,
    registrationPaymentStatus: application.registration_payment_status,
    registrationAmountPaise: application.registration_amount_paise,
    registrationPaymentId: application.registration_payment_id,
    registrationPaidAt: application.registration_paid_at,
    allotmentPaymentStatus: application.allotment_payment_status
  })

  return { buffer, applicationNumber: application.application_number }
}
