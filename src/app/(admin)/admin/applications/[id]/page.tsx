import { Fragment, type ReactNode } from 'react'

import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { query } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { getApprovalChecklist } from '@/lib/applications/approval-checklist'
import { getApplicationStatusConfig } from '@/lib/applications/status-config'
import { getAuditActionLabel, getRoleDisplayName } from '@/lib/audit/action-labels'
import { logAudit } from '@/lib/audit/log'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { decodeId, encodeId } from '@/lib/security/opaque-id'
import ApplicationAllotmentPaymentTab from '@/views/admin/applications/ApplicationAllotmentPaymentTab'
import ApplicationDecisionActions from '@/views/admin/applications/ApplicationDecisionActions'
import ApplicationFieldRow from '@/views/admin/applications/ApplicationFieldRow'
import ApplicationPdfDownloads from '@/views/admin/applications/ApplicationPdfDownloads'
import ApplicationRegistrationPaymentTab from '@/views/admin/applications/ApplicationRegistrationPaymentTab'
import ApplicationDocumentsSection from '@/views/admin/documents/ApplicationDocumentsSection'
import PersonalDocumentCard from '@/views/admin/documents/PersonalDocumentCard'
import EditApplicationDialog, { type EditableCategoryField, type EditableField } from '@/views/admin/applications/EditApplicationDialog'
import ApplicationTabsNav, { type ApplicationTabOrderItem } from '@/views/admin/applications/ApplicationTabsNav'

export const metadata: Metadata = {
  title: 'Application Detail — IGM Admin Portal'
}

type ApplicationRow = {
  id: number
  application_number: string
  status: string
  email: string
  organisation_name: string
  representative_name: string
  father_name: string
  police_station_name: string
  police_station_address: string
  aadhaar_last4: string
  aadhaar_ciphertext: Buffer
  address: string
  state: string
  district: string
  pin_code: string
  mobile_number: string
  alternate_mobile: string | null
  work_purpose: string
  achievement_experience: string
  remarks: string | null
  submitted_at: string | null
  created_at: string
  category_id: number
  category_name: string
  category_slug: string
  selection_method: string
  fee_amount_paise: number
  gst_percent: number
  allotment_amount_note: string | null
  shop_option_label: string | null
  stall_number: string | null
  allotment_amount_paise: number | null
  allotment_payment_status: string | null
  allotment_paid_at: string | null
  registration_payment_status: string | null
}

const ApplicationDetailPage = async ({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) => {
  const session = await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) notFound()

  // "Back to Applications" returns to the exact list view (filters, sort,
  // page) the admin opened this application from, instead of always
  // resetting to the unfiltered list — per explicit request. Only a
  // same-origin relative path is trusted here (must start with exactly one
  // `/`, never `//` which a browser resolves as protocol-relative to an
  // external host) — an untrusted `from` value could otherwise be used as
  // an open-redirect vector.
  const { from } = await searchParams
  const backToListUrl = from && from.startsWith('/') && !from.startsWith('//') ? from : '/admin/applications'

  // Previous/Next Application stays within the same category the admin was
  // browsing, instead of always stepping through every category's
  // applications in one combined order — per explicit request ("special art
  // craft waale page se aaya hoon to next/previous bhi isi cat ki aaye").
  // Parsed straight out of backToListUrl rather than a separate searchParams
  // field, since that URL already carries whatever category filter was
  // active on the list the admin came from.
  const listCategorySlug = (() => {
    try {
      return new URL(backToListUrl, 'http://localhost').searchParams.get('category')
    } catch {
      return null
    }
  })()

  const [
    rows,
    fieldValues,
    checkedFieldRows,
    documents,
    auditEntries,
    permissions,
    approvalChecklist,
    paymentRows,
    transactionRows,
    drawAllocationRows,
    reminderLogRows
  ] = await Promise.all([
    query<ApplicationRow[]>(
      `SELECT a.id, a.application_number, a.status, a.email, a.organisation_name, a.representative_name,
              a.father_name, a.police_station_name, a.police_station_address,
              a.aadhaar_last4, a.aadhaar_ciphertext, a.address, a.state, a.district, a.pin_code, a.mobile_number,
              a.alternate_mobile, a.work_purpose, a.achievement_experience, a.remarks, a.submitted_at, a.created_at,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.selection_method,
              COALESCE(c.fee_base_paise, c.fee_paise, 0) AS fee_amount_paise,
              COALESCE(c.gst_percent, 18.00) AS gst_percent,
              c.allotment_amount_note,
              so.label AS shop_option_label,
              COALESCE(su.stall_number, da_su.stall_number) AS stall_number,
              COALESCE(p.amount_paise, da.payment_amount_paise, c.allotment_amount_paise) AS allotment_amount_paise,
              COALESCE(p.status, da.payment_status) AS allotment_payment_status,
              (SELECT pt.created_at FROM payment_transactions pt
                WHERE pt.payment_id = p.id AND pt.type IN ('checkout_success', 'webhook_confirmed')
                ORDER BY pt.created_at DESC LIMIT 1) AS allotment_paid_at,
              reg_p.status AS registration_payment_status
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options so ON so.id = a.shop_option_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN payments p ON p.application_id = a.id AND p.purpose = 'pay_now'
       LEFT JOIN payments reg_p ON reg_p.application_id = a.id AND reg_p.purpose = 'registration'
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       LEFT JOIN shop_units da_su ON da_su.id = da.shop_unit_id
       WHERE a.id = ?`,
      [applicationId]
    ),
    query<
      Array<{
        field_definition_id: number
        field_key: string
        label: string
        label_hi: string | null
        value: string
        section: string | null
        section_hi: string | null
        input_type: string
        display_order: number
      }>
    >(
      `SELECT cfd.id AS field_definition_id, cfd.field_key, cfd.label, cfd.label_hi, cfd.section, cfd.section_hi, cfd.input_type, cfd.display_order, afv.value
       FROM application_field_values afv
       JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
       WHERE afv.application_id = ?
       ORDER BY cfd.display_order ASC`,
      [applicationId]
    ),
    query<Array<{ field_key: string }>>(`SELECT field_key FROM application_field_checks WHERE application_id = ?`, [
      applicationId
    ]),
    query<
      Array<{
        id: number | null
        document_key: string
        label: string
        original_filename: string | null
        verification_status: string | null
        verification_remarks: string | null
        verified_at: string | null
        reuploaded_at: string | null
        created_at: string | null
      }>
    >(

      // LEFT JOIN from the category's own required document definitions —
      // not just the documents actually uploaded — so a document the
      // applicant never uploaded at all still shows up here as a visible
      // "not uploaded yet" row, instead of silently not existing on this
      // page with no indication anything is still outstanding. Reported
      // live: an admin had no way to see that "Work/Product Photographs"
      // was still pending for an application sitting in query_raised.
      `SELECT ad.id, cdd.document_key, cdd.label, ad.original_filename, ad.verification_status, ad.verification_remarks,
              ad.verified_at, ad.reuploaded_at, ad.created_at
       FROM category_document_definitions cdd
       LEFT JOIN application_documents ad
         ON ad.document_definition_id = cdd.id AND ad.application_id = ?
       WHERE cdd.category_id = (SELECT category_id FROM applications WHERE id = ?) AND cdd.status = 'active'
       ORDER BY cdd.display_order ASC`,
      [applicationId, applicationId]
    ),
    query<Array<{ id: number; action: string; actor_role_key: string | null; new_value: string | null; created_at: string }>>(
      `SELECT id, action, actor_role_key, new_value, created_at
       FROM audit_logs
       WHERE entity_type = 'application' AND entity_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [String(applicationId)]
    ),
    getCurrentUserPermissions(),
    getApprovalChecklist(applicationId),
    query<
      Array<{
        id: number
        purpose: 'registration' | 'pay_now'
        amount_paise: number
        status: string
        razorpay_order_id: string | null
        created_at: string
        updated_at: string
      }>
    >(
      `SELECT id, purpose, amount_paise, status, razorpay_order_id, created_at, updated_at
       FROM payments
       WHERE application_id = ?
       ORDER BY id ASC`,
      [applicationId]
    ),
    query<
      Array<{
        id: number
        payment_id: number
        purpose: 'registration' | 'pay_now'
        type: string
        amount_paise: number
        razorpay_order_id: string | null
        razorpay_payment_id: string | null
        signature_valid: number | null
        failure_reason: string | null
        source: string
        webhook_event_id: string | null
        created_at: string
      }>
    >(
      `SELECT pt.id, pt.payment_id, p.purpose, pt.type, pt.amount_paise, pt.razorpay_order_id,
              pt.razorpay_payment_id, pt.signature_valid, pt.failure_reason, pt.source,
              pt.webhook_event_id, pt.created_at
       FROM payment_transactions pt
       JOIN payments p ON p.id = pt.payment_id
       WHERE p.application_id = ?
       ORDER BY pt.created_at DESC`,
      [applicationId]
    ),
    query<
      Array<{
        id: number
        draw_event_id: number
        draw_position: number
        allocation_type: string
        status: string
        draw_code: string
        round_number: number
        completed_at: string | null
      }>
    >(
      `SELECT da.id, da.draw_event_id, da.draw_position, da.allocation_type, da.status,
              de.draw_code, de.round_number, de.completed_at
       FROM draw_allocations da
       JOIN draw_events de ON de.id = da.draw_event_id
       WHERE da.application_id = ?
       LIMIT 1`,
      [applicationId]
    ),

    // "Send Payment Reminder" history, per explicit request — every
    // WhatsApp/email reminder send attempt is already logged here by
    // sendNotification() (src/lib/notifications/service.ts), one row per
    // channel per attempt, success or failure — this just surfaces it on
    // the Registration Payment tab instead of only in the DB/audit trail.
    query<
      Array<{
        id: number
        channel: 'whatsapp' | 'sms' | 'email'
        status: 'sent' | 'failed'
        campaign_name: string | null
        error_message: string | null
        created_at: string
      }>
    >(
      `SELECT id, channel, status, campaign_name, error_message, created_at
       FROM notification_log
       WHERE application_id = ? AND category = 'reminder'
       ORDER BY created_at DESC
       LIMIT 20`,
      [applicationId]
    )
  ])

  const app = rows[0]

  if (!app) notFound()

  // Previous/Next Application navigation — matches the Applications list's
  // own default order (created_at DESC, id as a tiebreak for same-instant
  // submissions), so clicking through from the list and clicking
  // Previous/Next here land on the same neighbor. Drafts are excluded, same
  // as the list itself never shows them. When the admin arrived from a
  // category-filtered list (listCategorySlug above), Previous/Next stays
  // within that same category instead of stepping through every category's
  // applications combined.
  const categoryFilterJoin = listCategorySlug
    ? `JOIN categories cat_filter ON cat_filter.id = applications.category_id AND cat_filter.slug = ?`
    : ''
  const categoryFilterParams = listCategorySlug ? [listCategorySlug] : []

  const [prevRows, nextRows] = await Promise.all([
    query<Array<{ id: number }>>(
      `SELECT applications.id FROM applications
       ${categoryFilterJoin}
       WHERE applications.status != 'draft' AND (applications.created_at, applications.id) > (?, ?)
       ORDER BY applications.created_at ASC, applications.id ASC LIMIT 1`,
      [...categoryFilterParams, app.created_at, app.id]
    ),
    query<Array<{ id: number }>>(
      `SELECT applications.id FROM applications
       ${categoryFilterJoin}
       WHERE applications.status != 'draft' AND (applications.created_at, applications.id) < (?, ?)
       ORDER BY applications.created_at DESC, applications.id DESC LIMIT 1`,
      [...categoryFilterParams, app.created_at, app.id]
    )
  ])

  const prevApplicationId = prevRows[0]?.id ?? null
  const nextApplicationId = nextRows[0]?.id ?? null

  // Full Aadhaar number is shown (not masked) to any admin with
  // application:view, per explicit instruction — every view is audit-logged
  // separately from the general page-view, since Aadhaar is sensitive PII
  // and .ai/SECURITY.md requires exposure of unmasked identifiers to be
  // traceable. Decryption happens only here, server-side, and the plaintext
  // is never sent to a Client Component beyond this rendered page.
  const aadhaarNumber = decryptAadhaar(Buffer.from(app.aadhaar_ciphertext))

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: 'application.aadhaar_viewed',
    module: 'applications',
    entityType: 'application',
    entityId: String(app.id)
  })

  const statusCfg = getApplicationStatusConfig(app.status)

  // 'payment_success' = legacy rows paid before payment moved straight to 'under_review'.
  const isReviewStage = app.status === 'under_review' || app.status === 'payment_success'

  // 'rejected' is included so a mistaken rejection can be reversed by
  // approving — deliberate "undo" path, same every-gate-still-applies rule
  // as a normal approval (every required document must still be verified).
  const canApprove =
    (isReviewStage || app.status === 'rejected') &&
    !!permissions?.has('application:approve') &&
    !!approvalChecklist?.allDocumentsVerified

  // 'approved' is included so a mistaken approval can be reversed by
  // rejecting — same "undo" symmetry as approve now allowing 'rejected'.
  const canReject =
    (isReviewStage || app.status === 'query_raised' || app.status === 'approved') &&
    !!permissions?.has('application:reject')

  const approveDisabledReason = canApprove
    ? undefined
    : !permissions?.has('application:approve')
      ? 'You do not have permission to approve applications.'
      : !isReviewStage && app.status !== 'rejected'
        ? `Approve is only available while the application is under review, or was rejected by mistake (current status: ${statusCfg.label}).`
        : 'Every required document must be verified before this application can be approved.'

  const rejectDisabledReason = canReject
    ? undefined
    : !permissions?.has('application:reject')
      ? 'You do not have permission to reject applications.'
      : `Reject is only available while the application is under review, has a query raised, or was approved by mistake (current status: ${statusCfg.label}).`

  const canVerifyDocuments = !!permissions?.has('document:verify')
  const canEditApplication = !!permissions?.has('application:edit')
  const checkedFieldKeys = new Set(checkedFieldRows.map(r => r.field_key))

  // Must stay in sync with EDITABLE_COLUMNS in
  // api/admin/applications/[id]/edit/route.ts — the route is the
  // authoritative allow-list; this just needs to offer the matching inputs.
  const editableFields: EditableField[] = [
    { key: 'representative_name', label: 'Representative Name', value: app.representative_name },
    { key: 'organisation_name', label: 'Organisation / Firm Name', value: app.organisation_name },
    { key: 'father_name', label: "Father's Name", value: app.father_name },
    { key: 'email', label: 'Email', value: app.email },
    { key: 'mobile_number', label: 'Mobile Number', value: app.mobile_number },
    { key: 'alternate_mobile', label: 'Alternate Mobile', value: app.alternate_mobile },
    { key: 'address', label: 'Address', value: app.address, multiline: true },
    { key: 'state', label: 'State', value: app.state },
    { key: 'district', label: 'District', value: app.district },
    { key: 'pin_code', label: 'PIN Code', value: app.pin_code },
    { key: 'police_station_name', label: 'Police Station Name', value: app.police_station_name },
    { key: 'police_station_address', label: 'Police Station Address', value: app.police_station_address, multiline: true },
    { key: 'work_purpose', label: 'Work Purpose', value: app.work_purpose, multiline: true },
    { key: 'achievement_experience', label: 'Achievement / Experience', value: app.achievement_experience, multiline: true },
    { key: 'remarks', label: 'Remarks', value: app.remarks, multiline: true }
  ]

  const editableCategoryFields: EditableCategoryField[] = fieldValues.map(f => ({
    fieldDefinitionId: f.field_definition_id,
    label: f.label,
    value: f.value,
    inputType: f.input_type
  }))


  // documents now includes a row per required document DEFINITION (not
  // just actually-uploaded ones, see the LEFT JOIN above) — a document the
  // applicant never uploaded has id: null, so it must be excluded here or
  // PersonalDocumentCard would render with a null id (broken preview link,
  // broken DocumentDecisionActions).
  const uploadedDocuments = documents.filter(
    (d): d is typeof d & { id: number; original_filename: string; verification_status: string } => d.id !== null
  )

  const missingDocuments = documents.filter(d => d.id === null)
  const aadhaarDocument = uploadedDocuments.find(d => d.document_key === 'aadhaar_card') ?? null

  // Inline a category-specific document right next to the one dynamic field
  // it's actually proof of, instead of leaving it only in the generic
  // Documents tab — mirrors the existing aadhaar_card/Personal-tab pattern.
  // Each entry's field_key is the single field this document is shown after
  // (a document key may list more than one, when the same field_key is used
  // under a different document_key across categories, e.g. the business
  // registration certificate — only one will ever actually be present on a
  // given application, since an application belongs to exactly one
  // category). Field keys mapped to more than one document here on purpose
  // are never attached a second time: only this map's own anchor field
  // renders the card, the field's other data rows (e.g. artisan_card's
  // issuing department/validity fields) render as plain text only.
  const DOCUMENT_FIELD_ANCHORS: Record<string, string[]> = {
    ngo_registration_number: ['ngo_registration_certificate'],
    business_registration_number: ['registration_certificate', 'firm_business_registration_certificate'],
    fssai_license_number: ['fssai_license'],
    artisan_card_number: ['artisan_card'],
    award_certificate_number: ['award_certificate'],
    registration_number: ['firm_registration_certificate'],
    shg_registration_number: ['shg_registration_certificate'],

    // work_product_photos (migration 0017) is required by 3 categories, each
    // with its own field naming for "what the applicant makes/displays" —
    // anchored to each category's own closest-matching field so the photo
    // proof shows up right next to it, same as every other anchored doc.
    // artisan-card-holders' products_made field was made inactive and
    // artisan_work_description relabeled to "Description of Products Made"
    // by migration 0025 — that relabeled field is the one actually shown
    // on the live form now, so it's the correct anchor, not products_made.
    artisan_work_description: ['work_product_photos'], // Artisan Card Holders
    products_to_display: ['work_product_photos'], // Special Art & Craft
    product_description: ['work_product_photos'] // National Awardees
  }

  const documentsByKey = new Map(uploadedDocuments.map(d => [d.document_key, d]))

  const findAnchoredDocument = (fieldKey: string) => {
    const candidateKeys = DOCUMENT_FIELD_ANCHORS[fieldKey]

    if (!candidateKeys) return null

    for (const key of candidateKeys) {
      const doc = documentsByKey.get(key)

      if (doc) return doc
    }

    return null
  }

  const approvalBlockedByDocs =
    isReviewStage && !!permissions?.has('application:approve') && !approvalChecklist?.allDocumentsVerified

  const [categorySectionsMap] = [new Map<string, typeof fieldValues>()]

  for (const fv of fieldValues) {
    const sectionName = fv.section?.trim() || 'Category Details'
    const list = categorySectionsMap.get(sectionName) ?? []

    list.push(fv)
    categorySectionsMap.set(sectionName, list)
  }

  const categorySections = Array.from(categorySectionsMap.entries())

  const registrationPayment = paymentRows.find(p => p.purpose === 'registration') ?? null
  const allotmentPayment = paymentRows.find(p => p.purpose === 'pay_now') ?? null
  const registrationTransactions = transactionRows.filter(t => t.purpose === 'registration')
  const allotmentTransactions = transactionRows.filter(t => t.purpose === 'pay_now')
  const drawAllocationRow = drawAllocationRows[0] ?? null

  // Application-level query history (queryApplicationAction's own audit
  // entries) — shown in the Documents tab's empty state so a reviewer can
  // see what was already asked for instead of the button just silently
  // working with no visible trail. new_value comes back as an already-
  // parsed object (mysql2 auto-parses JSON columns), not a string, despite
  // auditEntries' own type declaring it `string | null`.
  const applicationQueryHistory = auditEntries
    .filter(entry => entry.action === 'application.query_raised')
    .map(entry => {
      const value = entry.new_value as unknown as { remarks?: string } | null

      return { id: entry.id, remarks: value?.remarks ?? '', createdAt: entry.created_at }
    })

  const regIsPaid = registrationPayment?.status === 'success' || registrationPayment?.status === 'paid'

  // app.fee_amount_paise comes back from a raw COALESCE() over a numeric
  // column, which mysql2 surfaces as a string (e.g. "0", not 0) despite the
  // ApplicationRow type declaring it `number` — a strict `=== 0` comparison
  // against it was always false, so a genuinely free category (e.g.
  // Government Departments, fee_paise = 0) still showed "Registration
  // Payment: Pending" instead of "Free". Normalized once here so every
  // downstream use (this check, and categoryFeePaise passed to
  // ApplicationRegistrationPaymentTab below) gets a real number.
  const feeAmountPaise = Number(app.fee_amount_paise)
  const regIsFree = feeAmountPaise === 0 || registrationPayment?.status === 'exempt'

  const allotPaymentStatus = allotmentPayment?.status ?? app.allotment_payment_status
  const allotIsPaid = allotPaymentStatus === 'success' || allotPaymentStatus === 'paid'

  const allotIsFree =
    (app.allotment_amount_paise === 0 || app.allotment_amount_note?.toLowerCase().includes('free')) && !allotIsPaid

  const hasSelectionOrAllotment =
    Boolean(app.stall_number) ||
    Boolean(drawAllocationRow) ||
    Boolean(allotmentPayment) ||
    ['selected', 'allotted', 'payment_required', 're_allotted'].includes(app.status)

  const tabOrder: ApplicationTabOrderItem[] = [
    { value: 'personal', label: 'Personal' },
    { value: 'application', label: 'Application' },
    { value: 'documents', label: 'Documents' },
    { value: 'registration-payment', label: 'Registration Payment' },
    ...(hasSelectionOrAllotment ? [{ value: 'allotment-payment', label: 'Allotment Payment' }] : []),
    { value: 'audit', label: 'Audit Trail' }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Link
            href={backToListUrl}
            className='inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#0c2847] transition'
          >
            <ArrowLeftIcon className='size-4' /> Back to Applications
          </Link>

          <div className='flex items-center gap-2'>
            {prevApplicationId ? (
              <Link
                href={`/admin/applications/${encodeId(prevApplicationId)}?from=${encodeURIComponent(backToListUrl)}`}
                className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition'
              >
                <ChevronLeftIcon className='size-3.5' /> Previous Application
              </Link>
            ) : (
              <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-300 cursor-not-allowed'>
                <ChevronLeftIcon className='size-3.5' /> Previous Application
              </span>
            )}

            {nextApplicationId ? (
              <Link
                href={`/admin/applications/${encodeId(nextApplicationId)}?from=${encodeURIComponent(backToListUrl)}`}
                className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition'
              >
                Next Application <ChevronRightIcon className='size-3.5' />
              </Link>
            ) : (
              <span className='inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-300 cursor-not-allowed'>
                Next Application <ChevronRightIcon className='size-3.5' />
              </span>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='flex items-center gap-3 text-2xl font-bold tracking-tight text-[#0c2847]'>
              {app.application_number}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </h1>
            <p className='text-sm text-muted-foreground'>
              {[app.representative_name, app.organisation_name, app.category_name].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className='shrink-0'>
            <ApplicationPdfDownloads
              applicationId={id}
              hasRegistrationReceipt={
                regIsPaid || app.registration_payment_status === 'success' || regIsFree
              }
              hasAllotment={
                Boolean(app.stall_number) ||
                app.status === 'allotted' ||
                app.status === 'payment_required' ||
                app.status === 're_allotted'
              }
              hasAllotmentReceipt={
                allotIsPaid || app.allotment_payment_status === 'success'
              }
            />
          </div>
        </div>

        {approvalBlockedByDocs && (
          <p className='text-xs font-medium text-amber-700'>
            Approve will be available once every required document is verified
            {approvalChecklist && approvalChecklist.missingDocumentLabels.length > 0
              ? ` — still pending: ${approvalChecklist.missingDocumentLabels.join(', ')}.`
              : '.'}
          </p>
        )}

        <div className='flex flex-wrap items-center gap-2'>
          <ApplicationDecisionActions
            applicationId={id}
            canApprove={canApprove}
            canReject={canReject}
            approveDisabledReason={approveDisabledReason}
            rejectDisabledReason={rejectDisabledReason}
          />
          {canEditApplication && (
            <EditApplicationDialog
              applicationId={id}
              fields={editableFields}
              categoryFields={editableCategoryFields}
            />
          )}
        </div>
      </div>

      <ApplicationTabsNav tabOrder={tabOrder} defaultValue='personal'>
        <TabsList className='flex flex-wrap h-auto gap-1.5 p-1'>
          <TabsTrigger value='personal'>Personal</TabsTrigger>
          <TabsTrigger value='application'>Application</TabsTrigger>
          <TabsTrigger value='documents'>Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value='registration-payment' className='flex items-center gap-1.5'>
            Registration Payment
            {regIsPaid ? (
              <span className='rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800'>
                Paid
              </span>
            ) : regIsFree ? (
              <span className='rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800'>
                Free
              </span>
            ) : (
              <span className='rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800'>
                Pending
              </span>
            )}
          </TabsTrigger>
          {hasSelectionOrAllotment && (
            <TabsTrigger value='allotment-payment' className='flex items-center gap-1.5'>
              Allotment Payment
              {allotIsPaid ? (
                <span className='rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800'>
                  Paid
                </span>
              ) : allotIsFree ? (
                <span className='rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-800'>
                  Exempt
                </span>
              ) : app.stall_number ? (
                <span className='rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800'>
                  Due
                </span>
              ) : null}
            </TabsTrigger>
          )}
          <TabsTrigger value='audit'>Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value='personal'>
          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base'>Personal Details</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionLabel>Identity</SectionLabel>
              <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='representative_name'
                  label='Representative Name'
                  value={app.representative_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('representative_name')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='father_name'
                  label="Father's Name"
                  value={app.father_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('father_name')}
                />
                {app.organisation_name && (
                  <ApplicationFieldRow
                    applicationId={id}
                    fieldKey='organisation_name'
                    label='Organisation / Firm Name'
                    value={app.organisation_name}
                    canCheck={canVerifyDocuments}
                    initiallyChecked={checkedFieldKeys.has('organisation_name')}
                  />
                )}
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='aadhaar_number'
                  label='Aadhaar Number'
                  value={`${aadhaarNumber.slice(0, 4)}-${aadhaarNumber.slice(4, 8)}-${aadhaarNumber.slice(8, 12)}`}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('aadhaar_number')}
                />
                {aadhaarDocument && (
                  <PersonalDocumentCard document={aadhaarDocument} canVerifyDocuments={canVerifyDocuments} />
                )}
              </div>

              <SectionLabel className='mt-6'>Contact & Address</SectionLabel>
              <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='email'
                  label='Email'
                  value={app.email}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('email')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='mobile_number'
                  label='WhatsApp Number'
                  value={app.mobile_number}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('mobile_number')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='alternate_mobile'
                  label='Alternate Mobile'
                  value={app.alternate_mobile ?? '—'}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('alternate_mobile')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='pin_code'
                  label='PIN Code'
                  value={app.pin_code}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('pin_code')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='address'
                  label='Address'
                  value={app.address}
                  full
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('address')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='district'
                  label='District'
                  value={app.district}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('district')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='state'
                  label='State'
                  value={app.state}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('state')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='police_station_name'
                  label='Police Station Name'
                  value={app.police_station_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('police_station_name')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='police_station_address'
                  label='Police Station Address'
                  value={app.police_station_address}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('police_station_address')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='application'>
          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base'>Application Details</CardTitle>
            </CardHeader>
            <CardContent>
              <SectionLabel>Application Information</SectionLabel>
              <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='category'
                  label='Category'
                  value={app.category_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('category')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='selection_method'
                  label='Selection Method'
                  value={app.selection_method}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('selection_method')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='shop_option'
                  label='Booth/Stall Option'
                  value={app.shop_option_label ?? '—'}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('shop_option')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='submitted_at'
                  label='Submitted At'
                  value={
                    app.submitted_at
                      ? new Date(app.submitted_at).toLocaleString('en-IN')
                      : `Draft (created ${new Date(app.created_at).toLocaleDateString('en-IN')})`
                  }
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('submitted_at')}
                />
                {app.work_purpose && (
                  <ApplicationFieldRow
                    applicationId={id}
                    fieldKey='work_purpose'
                    label='Purpose of Work'
                    value={app.work_purpose}
                    full
                    canCheck={canVerifyDocuments}
                    initiallyChecked={checkedFieldKeys.has('work_purpose')}
                  />
                )}
                {app.achievement_experience && (
                  <ApplicationFieldRow
                    applicationId={id}
                    fieldKey='achievement_experience'
                    label='Achievements / Experience'
                    value={app.achievement_experience}
                    full
                    canCheck={canVerifyDocuments}
                    initiallyChecked={checkedFieldKeys.has('achievement_experience')}
                  />
                )}
                {app.remarks && (
                  <ApplicationFieldRow
                    applicationId={id}
                    fieldKey='remarks'
                    label='Applicant Remarks'
                    value={app.remarks}
                    full
                    canCheck={canVerifyDocuments}
                    initiallyChecked={checkedFieldKeys.has('remarks')}
                  />
                )}
              </div>

              {categorySections.map(([sectionName, sectionFields]) => (
                <div key={sectionName} className='mt-6'>
                  <SectionLabel>{sectionName}</SectionLabel>
                  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                    {sectionFields.map(fv => {
                      const fieldKey = `dynamic:${fv.field_definition_id}`
                      const isFull = fv.input_type === 'textarea' || fv.input_type === 'multiselect'
                      const anchoredDocument = findAnchoredDocument(fv.field_key)

                      return (
                        <Fragment key={fieldKey}>
                          <ApplicationFieldRow
                            applicationId={id}
                            fieldKey={fieldKey}
                            label={fv.label}
                            value={fv.value}
                            full={isFull}
                            canCheck={canVerifyDocuments}
                            initiallyChecked={checkedFieldKeys.has(fieldKey)}
                          />
                          {anchoredDocument && (
                            <PersonalDocumentCard document={anchoredDocument} canVerifyDocuments={canVerifyDocuments} />
                          )}
                        </Fragment>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='documents'>
          <ApplicationDocumentsSection
            documents={documents}
            canVerifyDocuments={canVerifyDocuments}
            canEditApplication={canEditApplication}
            applicationId={id}
            numericApplicationId={app.id}
            canRaiseApplicationQuery={
              canVerifyDocuments && (isReviewStage || app.status === 'query_raised')
            }
            applicationQueryHistory={applicationQueryHistory}
          />
        </TabsContent>

        <TabsContent value='registration-payment'>
          <ApplicationRegistrationPaymentTab
            applicationId={id}
            applicationNumber={app.application_number}
            applicantName={app.representative_name || app.organisation_name}
            mobileNumber={app.mobile_number}
            email={app.email}
            categoryName={app.category_name}
            categoryFeePaise={feeAmountPaise}
            gstPercent={app.gst_percent}
            payment={registrationPayment}
            transactions={registrationTransactions}
            canSendReminder={!!permissions?.has('payment:reminder')}
            reminderHistory={reminderLogRows}
          />
        </TabsContent>

        {hasSelectionOrAllotment && (
          <TabsContent value='allotment-payment'>
            <ApplicationAllotmentPaymentTab
              applicationId={id}
              applicationNumber={app.application_number}
              categoryName={app.category_name}
              selectionMethod={app.selection_method}
              stallNumber={app.stall_number}
              status={app.status}
              expectedAmountPaise={app.allotment_amount_paise}
              allotmentAmountNote={app.allotment_amount_note}
              payment={allotmentPayment}
              transactions={allotmentTransactions}
              drawAllocation={drawAllocationRow}
              canSendReminder={!!permissions?.has('payment:reminder')}
            />
          </TabsContent>
        )}

        <TabsContent value='audit'>
          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base'>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {auditEntries.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>No audit entries for this application yet.</p>
              ) : (
                <div className='space-y-3'>
                  {auditEntries.map(entry => (
                    <div key={entry.id} className='rounded-md border border-border/60 px-3 py-2 text-sm'>
                      <div className='flex items-center justify-between'>
                        <span className='font-semibold text-[#0c2847]'>{getAuditActionLabel(entry.action)}</span>
                        <span className='text-xs text-muted-foreground'>
                          {new Date(entry.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        By: {entry.actor_role_key ? getRoleDisplayName(entry.actor_role_key) : 'System'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </ApplicationTabsNav>
    </div>
  )
}

const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={`mb-3 text-xs font-bold uppercase tracking-wider text-[#8c5711] ${className ?? ''}`}>{children}</p>
)

export default ApplicationDetailPage
