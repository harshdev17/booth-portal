import { Fragment, type ReactNode } from 'react'

import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { withPooledConnection } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { getApprovalChecklist } from '@/lib/applications/approval-checklist'
import { isStaticQueryableField, listFieldQueries, STATIC_QUERYABLE_FIELDS } from '@/lib/applications/field-queries'
import { getApplicationStatusConfig } from '@/lib/applications/status-config'
import { logAudit } from '@/lib/audit/log'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { decodeId, encodeId } from '@/lib/security/opaque-id'
import { formatDateTime, parseIstDateTime } from '@/lib/format-date'
import ApplicationAllotmentPaymentTab from '@/views/admin/applications/ApplicationAllotmentPaymentTab'
import ApplicationDecisionActions from '@/views/admin/applications/ApplicationDecisionActions'
import MultiFieldQueryDialog from '@/views/admin/applications/MultiFieldQueryDialog'
import ApplicationFieldRow, { type FieldQuerySummary } from '@/views/admin/applications/ApplicationFieldRow'
import ApplicationHistoryTab from '@/views/admin/applications/ApplicationHistoryTab'
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
  allotment_letter_released_at: string | null
  shop_option_label: string | null
  stall_number: string | null
  allotment_amount_paise: number | null
  allotment_payment_status: string | null
  allotment_paid_at: string | null
  registration_payment_status: string | null
}

// Whole days between `date` and the time this page is rendered.
function wholeDaysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000)
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

  // Split across 2 pooled connections run concurrently, not 1 — this page
  // used to run ALL ~11 queries sequentially on a single connection (a prior
  // pass merged them down from 4 separate connections to cut Hostinger's
  // connection-cap risk), but on a remote DB every sequential round trip
  // adds its own latency, so 11-in-a-row made the page noticeably slower to
  // open (reported live, 2026-11-15). 2 connections in parallel is a
  // deliberate middle ground: still well under connectionLimit (10, see
  // client.ts) even with several admins open at once, while halving the
  // page's critical-path query latency. Connection A holds what the top of
  // the page needs immediately (the application itself + its field
  // values/documents); Connection B holds everything gated behind a tab
  // click (audit trail, payments, draw info) plus prev/next nav.
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

  // Connection A: the application row itself plus everything the top of
  // the page renders immediately (field values, documents) — kept small so
  // this connection's queries finish fast and the page has its core
  // content as soon as possible.
  const connectionAPromise = withPooledConnection(async q => {
    const rows = await q<ApplicationRow[]>(
      `SELECT a.id, a.application_number, a.status, a.email, a.organisation_name, a.representative_name,
              a.allotment_letter_released_at,
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
    )

    const app = rows[0]

    if (!app) notFound()

    const fieldValues = await q<
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
    )

    const checkedFieldRows = await q<Array<{ field_key: string }>>(
      `SELECT field_key FROM application_field_checks WHERE application_id = ?`,
      [applicationId]
    )

    const documents = await q<
      Array<{
        id: number | null
        document_key: string
        label: string
        original_filename: string | null
        verification_status: string | null
        verification_remarks: string | null
        reupload_notes: string | null
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
              ad.reupload_notes, ad.verified_at, ad.reuploaded_at, ad.created_at
       FROM category_document_definitions cdd
       LEFT JOIN application_documents ad
         ON ad.document_definition_id = cdd.id AND ad.application_id = ?
       WHERE cdd.category_id = (SELECT category_id FROM applications WHERE id = ?) AND cdd.status = 'active'
       ORDER BY cdd.display_order ASC`,
      [applicationId, applicationId]
    )

    // Every superseded version of every document for this application (see
    // migration 0077) — grouped by application_document_id below so each
    // document row can show its own "Previous versions" disclosure. Only
    // re-uploads made AFTER this feature shipped have any rows here; older
    // overwrites were never preserved and can't be recovered (see
    // .ai/CHANGELOG.md 2026-11-15).
    const documentVersionRows = await q<
      Array<{
        id: number
        application_document_id: number
        original_filename: string
        verification_status: string
        verification_remarks: string | null
        superseded_at: string
      }>
    >(
      `SELECT adv.id, adv.application_document_id, adv.original_filename, adv.verification_status,
              adv.verification_remarks, adv.superseded_at
       FROM application_document_versions adv
       JOIN application_documents ad ON ad.id = adv.application_document_id
       WHERE ad.application_id = ?
       ORDER BY adv.superseded_at DESC`,
      [applicationId]
    )

    const fieldQueryRows = await listFieldQueries(applicationId, q)

    const prevRows = await q<Array<{ id: number }>>(
      `SELECT applications.id FROM applications
       ${categoryFilterJoin}
       WHERE applications.status != 'draft' AND (applications.created_at, applications.id) > (?, ?)
       ORDER BY applications.created_at ASC, applications.id ASC LIMIT 1`,
      [...categoryFilterParams, app.created_at, app.id]
    )

    const nextRows = await q<Array<{ id: number }>>(
      `SELECT applications.id FROM applications
       ${categoryFilterJoin}
       WHERE applications.status != 'draft' AND (applications.created_at, applications.id) < (?, ?)
       ORDER BY applications.created_at DESC, applications.id DESC LIMIT 1`,
      [...categoryFilterParams, app.created_at, app.id]
    )

    return {
      app,
      fieldValues,
      checkedFieldRows,
      documents,
      documentVersionRows,
      fieldQueryRows,
      prevApplicationId: prevRows[0]?.id ?? null,
      nextApplicationId: nextRows[0]?.id ?? null
    }
  })

  // Connection B: everything gated behind a tab click (Audit Trail,
  // Registration/Allotment Payment, Draw info) — independent of Connection
  // A's data, so it runs concurrently rather than queuing behind it.
  const connectionBPromise = withPooledConnection(async q => {
    // Broadened beyond entity_type='application' alone — a document
    // decision or payment event for THIS application is logged against
    // entityType 'application_document'/'payment', not 'application', so
    // the Audit Trail tab was previously missing them even though they
    // were already in the DB. LIMIT raised from 50 to 100 since merging
    // in notification_log (below) means more total rows per application.
    const auditEntries = await q<
      Array<{
        id: number
        action: string
        actor_role_key: string | null
        previous_value: string | null
        new_value: string | null
        created_at: string
      }>
    >(
      `SELECT id, action, actor_role_key, previous_value, new_value, created_at
       FROM audit_logs
       WHERE (entity_type = 'application' AND entity_id = ?)
          OR (entity_type = 'application_document' AND entity_id IN (
               SELECT id FROM application_documents WHERE application_id = ?
             ))
          OR (entity_type = 'payment' AND entity_id IN (
               SELECT id FROM payments WHERE application_id = ?
             ))
       ORDER BY created_at DESC
       LIMIT 100`,
      [String(applicationId), applicationId, applicationId]
    )

    // WhatsApp/SMS/email sends live in a separate table from audit_logs —
    // merged into the same timeline (below, after both queries run) so an
    // admin can see whether/when a message actually reached the
    // applicant, not just that the system decided to send one.
    const notificationEntries = await q<
      Array<{
        channel: 'whatsapp' | 'sms' | 'email'
        category: string
        destination: string
        status: 'sent' | 'failed'
        error_message: string | null
        created_at: string
      }>
    >(
      `SELECT channel, category, destination, status, error_message, created_at
       FROM notification_log
       WHERE application_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [applicationId]
    )

    // Shares this same connection (q) instead of getApprovalChecklist()
    // checking out one of its own — see the optional runQuery param on
    // getApprovalChecklist() in approval-checklist.ts.
    const approvalChecklist = await getApprovalChecklist(applicationId, q)

    const paymentRows = await q<
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
    )

    const transactionRows = await q<
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
    )

    const drawAllocationRows = await q<
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
    )

    // "Send Payment Reminder" history, per explicit request — every
    // WhatsApp/email reminder send attempt is already logged here by
    // sendNotification() (src/lib/notifications/service.ts), one row per
    // channel per attempt, success or failure — this just surfaces it on
    // the Registration Payment tab instead of only in the DB/audit trail.
    const reminderLogRows = await q<
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

    return { auditEntries, notificationEntries, approvalChecklist, paymentRows, transactionRows, drawAllocationRows, reminderLogRows }
  })

  const [connectionA, connectionB, permissions] = await Promise.all([
    connectionAPromise,
    connectionBPromise,
    getCurrentUserPermissions()
  ])

  const {
    app,
    fieldValues,
    checkedFieldRows,
    documents,
    documentVersionRows,
    fieldQueryRows,
    prevApplicationId,
    nextApplicationId
  } = connectionA

  // Latest open-or-answered query per field (rows arrive newest first).
  const fieldQueryByKey = new Map<string, FieldQuerySummary>()

  for (const row of fieldQueryRows) {
    if (row.status === 'cancelled') continue
    if (fieldQueryByKey.has(row.field_key)) continue

    fieldQueryByKey.set(row.field_key, {
      id: row.id,
      status: row.status === 'open' ? 'open' : 'responded',
      remarks: row.remarks,
      previousValue: row.previous_value,
      newValue: row.new_value,
      applicantNotes: row.applicant_notes
    })
  }

  // Grouped by application_document_id so each document row can look up
  // its own previous versions (newest-superseded first, since the source
  // query is already ordered that way) without re-filtering the full list
  // per row.
  const documentVersionsByDocumentId = new Map<number, typeof documentVersionRows>()

  for (const version of documentVersionRows) {
    const list = documentVersionsByDocumentId.get(version.application_document_id) ?? []

    list.push(version)
    documentVersionsByDocumentId.set(version.application_document_id, list)
  }

  const {
    auditEntries,
    notificationEntries,
    approvalChecklist,
    paymentRows,
    transactionRows,
    drawAllocationRows,
    reminderLogRows
  } = connectionB

  // Merged, time-ordered history feed for the Audit Trail tab: audit_logs
  // entries (system/admin actions) interleaved with notification_log
  // entries (actual WhatsApp/SMS/email sends) — two separate tables
  // previously shown nowhere together, so an admin had no way to see
  // whether a status-update/approval/rejection/reminder message actually
  // reached the applicant alongside the action that triggered it.
  const historyTimeline = [
    ...auditEntries.map(entry => ({ kind: 'audit' as const, timestamp: entry.created_at, entry })),
    ...notificationEntries.map(entry => ({ kind: 'notification' as const, timestamp: entry.created_at, entry }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

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

  // "Query open since…" banner at the top of the view: when the most recent
  // query was raised (document, field or application-level), shown only
  // while something is still waiting on the applicant.
  const openDocumentQueries = documents.filter(d => d.verification_status === 'query')
  const openFieldQueryRows = fieldQueryRows.filter(q => q.status === 'open')
  const hasOpenQuery = app.status === 'query_raised' || openDocumentQueries.length > 0 || openFieldQueryRows.length > 0
  const QUERY_AUDIT_ACTIONS = new Set(['application.query_raised', 'document.query', 'field.query_raised'])

  const queryTimestamps = [
    ...openDocumentQueries.map(d => d.verified_at),
    ...openFieldQueryRows.map(q => q.created_at),
    ...auditEntries.filter(e => QUERY_AUDIT_ACTIONS.has(e.action)).map(e => e.created_at)
  ].filter((t): t is string => Boolean(t))

  const lastQueryAt = hasOpenQuery
    ? (queryTimestamps.reduce<Date | null>((latest, t) => {
        const at = parseIstDateTime(t)

        return !latest || at > latest ? at : latest
      }, null) ?? null)
    : null

  const daysSinceLastQuery = lastQueryAt ? wholeDaysSince(lastQueryAt) : 0

  // Every item still waiting on the applicant, each with the date its own
  // query was raised (they can differ), newest first. An application-level
  // query has no per-item state, so its most recent one is listed while the
  // application is in query_raised.
  // Only treat a whole-application query as currently open when it's
  // actually what explains the current query_raised status — if a document
  // or field query is open, THAT is what's keeping the application in
  // query_raised, so a long-resolved historical application.query_raised
  // audit entry must not be resurrected as a false "Whole application" item
  // (previously happened whenever a field/document query was raised on an
  // application that had ANY whole-application query anywhere in its past,
  // since applications.status is a single flag shared by all 3 query
  // mechanisms but only document/field queries have real per-item state).
  const latestApplicationQuery =
    app.status === 'query_raised' && openDocumentQueries.length === 0 && openFieldQueryRows.length === 0
      ? auditEntries.find(e => e.action === 'application.query_raised')
      : undefined

  const openQueryItems = [
    ...openDocumentQueries.map(d => ({ key: `doc-${d.document_key}`, kind: 'Document', label: d.label, at: d.verified_at })),
    ...openFieldQueryRows.map(q => ({ key: `field-${q.id}`, kind: 'Field', label: q.field_label, at: q.created_at as string | null })),
    ...(latestApplicationQuery
      ? [{ key: 'application', kind: 'Application', label: 'Whole application', at: latestApplicationQuery.created_at as string | null }]
      : [])
  ]
    .map(item => ({ ...item, date: item.at ? parseIstDateTime(item.at) : null }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))

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

  // Plain undo — puts a mistakenly approved/rejected application back to
  // Under Review without re-deciding it the other way, per explicit
  // request. Gated by application:edit since this is a correction, not an
  // approval/rejection decision itself.
  const canRevertToReview =
    (app.status === 'approved' || app.status === 'rejected') && !!permissions?.has('application:edit')

  const canVerifyDocuments = !!permissions?.has('document:verify')

  // Field queries: same permission and same review-stage statuses as the
  // document/application queries; identity fields (email, mobile, Aadhaar)
  // are excluded — see STATIC_QUERYABLE_FIELDS in field-queries.ts.
  const canRaiseFieldQueries =
    canVerifyDocuments && ['under_review', 'payment_success', 'query_raised'].includes(app.status)

  const canQueryField = (fieldKey: string) =>
    canRaiseFieldQueries && (isStaticQueryableField(fieldKey) || fieldKey.startsWith('dynamic:'))

  // Flat candidate list for the "Raise Query on Multiple Fields" dialog —
  // every queryable field this application actually has, with its current
  // value and whether it already has an open query (so the dialog can show
  // it as disabled rather than letting the admin double-query it). Static
  // fields come from STATIC_QUERYABLE_FIELDS directly off `app`; dynamic
  // (category-specific) fields come from `fieldValues`, same `dynamic:<id>`
  // key the per-row ApplicationFieldRow instances already use.
  const multiQueryCandidates = canRaiseFieldQueries
    ? [
        ...(Object.keys(STATIC_QUERYABLE_FIELDS) as Array<keyof typeof STATIC_QUERYABLE_FIELDS>).map(key => ({
          fieldKey: key as string,
          label: STATIC_QUERYABLE_FIELDS[key].label,
          currentValue: (app[key as keyof typeof app] as string | null) ?? '',
          alreadyOpen: fieldQueryByKey.get(key)?.status === 'open'
        })),
        ...fieldValues.map(fv => ({
          fieldKey: `dynamic:${fv.field_definition_id}`,
          label: fv.label,
          currentValue: fv.value ?? '',
          alreadyOpen: fieldQueryByKey.get(`dynamic:${fv.field_definition_id}`)?.status === 'open'
        }))
      ]
    : []

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
  // Rule, applied consistently across every category: a document always
  // anchors to the LAST field of its own section, never a field in the
  // middle — so the card always shows up at the end of that section's
  // fields, not interrupting them partway through. Verified against a full
  // dump of every active category's own field_key/section/display_order
  // (2026-11-13) rather than guessed per-category.
  const DOCUMENT_FIELD_ANCHORS: Record<string, string[]> = {
    // Social Organizations — Organisation Details section, last field
    // organization_type, carries both its non-Aadhaar documents
    // (ngo_registration_certificate AND authorization_letter — the latter
    // had no anchor at all before and only ever showed on the Documents
    // tab, same gap Brand Promotion's authorization_letter/
    // sponsorship_proposal had before being fixed below)
    organization_type: ['ngo_registration_certificate', 'authorization_letter'],

    // Refreshment Stalls — Business Details section's LAST ACTIVE field is
    // business_registration_number, but it's optional and most real
    // applications leave it blank (no application_field_values row at all
    // for it) — when that happens, gst_number (also optional) or pan_number
    // becomes the section's effective last FILLED field for that specific
    // application, so the document needs an anchor on each of them too, not
    // just the nominal last field. (Confirmed live, 2026-11-13: most real
    // Refreshment applications only have business_firm_name/pan_number/
    // fssai fields filled, no business_registration_number row at all —
    // the document was silently never showing up because of it.)
    // FSSAI License section, last field fssai_validity_date (shared
    // field_key with Sweets below, same document_key either way, so no
    // cross-category conflict).
    business_registration_number: ['registration_certificate'],
    gst_number: ['registration_certificate'],
    pan_number: ['registration_certificate'],
    fssai_validity_date: ['fssai_license'],

    // Sweets, Bakers and Special Food Items — Business Details section has only
    // one field (business_firm_name, so it's also the last); Product Details
    // section, last field products_description
    business_firm_name: ['registration_certificate'],
    products_description: ['product_photos'],

    // SARAS — SHG Details section, last field shg_member_count, carries
    // both shg_registration_certificate and authorization_letter (same gap
    // as Social Organizations above — authorization_letter had no anchor);
    // Products section, last (only) field product_description
    shg_member_count: ['shg_registration_certificate', 'authorization_letter'],

    // Artisan Card Holders — Artisan Card section, last field artisan_card_validity;
    // Artisan Work section, last field artisan_work_description (relabeled
    // "Description of Products Made" by migration 0025 — the field actually
    // shown on the live form now, not the inactive products_made)
    artisan_card_validity: ['artisan_card'],
    artisan_work_description: ['work_product_photos'],

    // National Awardees — Award Details section, last field award_description;
    // Work Details section, last field work_description. Previously
    // work_product_photos was wrongly anchored to product_description, a
    // field_key this category doesn't even have (that's SARAS/Wooden Craft's
    // field) — the document silently never showed up here because of it.
    award_description: ['award_certificate'],
    work_description: ['work_product_photos'],

    // Special Art & Craft (Without card holder) — Craft Details section,
    // last field years_of_experience (previously anchored to
    // products_to_display, a field in the MIDDLE of this section)
    years_of_experience: ['work_product_photos'],

    // Wooden Craft & Carpets — Business Details section has no document of
    // its own; Products section, last field product_description, carries
    // BOTH of this category's non-Aadhaar documents (the one category where
    // two of its own documents can both be present on the same application)
    product_description: ['firm_business_registration_certificate', 'product_work_photos'],

    // Government Departments — Department Details section has only one
    // field (organisation_name, so it's also the last). organisation_name
    // is also a field_key in Social Organizations and Brand Promotion, but
    // department_authorization_letter is a document_key only Government
    // Departments applications ever have, so findAnchoredDocuments()
    // naturally returns nothing for it on those other two categories.
    organisation_name: ['department_authorization_letter'],

    // Brand Promotion & Corporate — Company & Brand Details section, last
    // field website; Promotion section, last field promotion_purpose,
    // carries the other 2 documents (per explicit request — Authorization
    // Letter and Sponsorship Proposal have no field of their own to anchor
    // to, but should still show up on the Application tab, not only the
    // Documents tab)
    website: ['firm_registration_certificate'],
    promotion_purpose: ['authorization_letter', 'sponsorship_proposal']
  }

  const documentsByKey = new Map(uploadedDocuments.map(d => [d.document_key, d]))

  const findAnchoredDocuments = (fieldKey: string) => {
    const candidateKeys = DOCUMENT_FIELD_ANCHORS[fieldKey]

    if (!candidateKeys) return []

    return candidateKeys.flatMap(key => {
      const doc = documentsByKey.get(key)

      return doc ? [doc] : []
    })
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

  // Most recent rejection reason — shown right under the status badge when
  // the application is currently 'rejected', so an admin doesn't have to
  // open the Audit Trail tab to see why it was rejected. auditEntries is
  // already ordered newest-first, so the first match is the latest
  // rejection (relevant if it was rejected more than once across its
  // history — e.g. approved, reverted, rejected again).
  const latestRejection =
    app.status === 'rejected'
      ? (() => {
          const entry = auditEntries.find(e => e.action === 'application.rejected')
          const value = entry?.new_value as unknown as { reason?: string } | null

          return entry ? { reason: value?.reason ?? '', createdAt: entry.created_at } : null
        })()
      : null

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

        {hasOpenQuery && (
          <div className='rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5'>
            <p className='text-xs font-bold uppercase tracking-wider text-amber-800'>Query Open</p>
            <p className='mt-0.5 text-sm text-amber-950'>
              {lastQueryAt ? (
                <>
                  Last query raised on <span className='font-semibold'>{formatDateTime(lastQueryAt, 'en')}</span>
                  {' '}
                  ({daysSinceLastQuery === 0 ? 'today' : daysSinceLastQuery === 1 ? '1 day ago' : `${daysSinceLastQuery} days ago`})
                </>
              ) : (
                'Waiting on the applicant — query date not recorded.'
              )}
            </p>
            {openQueryItems.length > 0 && (
              <ul className='mt-1.5 flex flex-col gap-1 text-xs text-amber-900'>
                {openQueryItems.map(item => (
                  <li key={item.key} className='flex flex-wrap gap-x-1.5'>
                    <span className='font-semibold'>{item.label}</span>
                    <span className='text-amber-700'>({item.kind})</span>
                    <span>
                      — raised{' '}
                      {item.date
                        ? `${formatDateTime(item.date, 'en')}, ${(d => (d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`))(wholeDaysSince(item.date))}`
                        : 'date not recorded'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {latestRejection && (
          <div className='rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5'>
            <p className='text-xs font-bold uppercase tracking-wider text-red-700'>Rejection Reason</p>
            <p className='mt-0.5 text-sm text-red-900'>{latestRejection.reason}</p>
            <p className='mt-1 text-[11px] text-red-700/80'>
              {new Date(latestRejection.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
        )}

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
            canRevertToReview={canRevertToReview}
          />
          {canEditApplication && (
            <EditApplicationDialog
              applicationId={id}
              fields={editableFields}
              categoryFields={editableCategoryFields}
            />
          )}
          <MultiFieldQueryDialog applicationId={id} candidates={multiQueryCandidates} />
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
                  canQuery={canQueryField('representative_name')}
                  fieldQuery={fieldQueryByKey.get('representative_name')}
                  label='Representative Name'
                  value={app.representative_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('representative_name')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='father_name'
                  canQuery={canQueryField('father_name')}
                  fieldQuery={fieldQueryByKey.get('father_name')}
                  label="Father's Name"
                  value={app.father_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('father_name')}
                />
                {app.organisation_name && (
                  <ApplicationFieldRow
                    applicationId={id}
                    fieldKey='organisation_name'
                    canQuery={canQueryField('organisation_name')}
                    fieldQuery={fieldQueryByKey.get('organisation_name')}
                    label='Organisation / Firm Name'
                    value={app.organisation_name}
                    canCheck={canVerifyDocuments}
                    initiallyChecked={checkedFieldKeys.has('organisation_name')}
                  />
                )}
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='aadhaar_number'
                  canQuery={canQueryField('aadhaar_number')}
                  fieldQuery={fieldQueryByKey.get('aadhaar_number')}
                  label='Aadhaar Number'
                  value={`${aadhaarNumber.slice(0, 4)}-${aadhaarNumber.slice(4, 8)}-${aadhaarNumber.slice(8, 12)}`}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('aadhaar_number')}
                />
                {aadhaarDocument && (
                  <PersonalDocumentCard
                    document={aadhaarDocument}
                    canVerifyDocuments={canVerifyDocuments}
                    previousVersions={documentVersionsByDocumentId.get(aadhaarDocument.id) ?? []}
                  />
                )}
              </div>

              <SectionLabel className='mt-6'>Contact & Address</SectionLabel>
              <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='email'
                  canQuery={canQueryField('email')}
                  fieldQuery={fieldQueryByKey.get('email')}
                  label='Email'
                  value={app.email}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('email')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='mobile_number'
                  canQuery={canQueryField('mobile_number')}
                  fieldQuery={fieldQueryByKey.get('mobile_number')}
                  label='WhatsApp Number'
                  value={app.mobile_number}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('mobile_number')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='alternate_mobile'
                  canQuery={canQueryField('alternate_mobile')}
                  fieldQuery={fieldQueryByKey.get('alternate_mobile')}
                  label='Alternate Mobile'
                  value={app.alternate_mobile ?? '—'}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('alternate_mobile')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='pin_code'
                  canQuery={canQueryField('pin_code')}
                  fieldQuery={fieldQueryByKey.get('pin_code')}
                  label='PIN Code'
                  value={app.pin_code}
                  mono
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('pin_code')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='address'
                  canQuery={canQueryField('address')}
                  fieldQuery={fieldQueryByKey.get('address')}
                  label='Address'
                  value={app.address}
                  full
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('address')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='district'
                  canQuery={canQueryField('district')}
                  fieldQuery={fieldQueryByKey.get('district')}
                  label='District'
                  value={app.district}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('district')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='state'
                  canQuery={canQueryField('state')}
                  fieldQuery={fieldQueryByKey.get('state')}
                  label='State'
                  value={app.state}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('state')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='police_station_name'
                  canQuery={canQueryField('police_station_name')}
                  fieldQuery={fieldQueryByKey.get('police_station_name')}
                  label='Police Station Name'
                  value={app.police_station_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('police_station_name')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='police_station_address'
                  canQuery={canQueryField('police_station_address')}
                  fieldQuery={fieldQueryByKey.get('police_station_address')}
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
                  canQuery={canQueryField('category')}
                  fieldQuery={fieldQueryByKey.get('category')}
                  label='Category'
                  value={app.category_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('category')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='selection_method'
                  canQuery={canQueryField('selection_method')}
                  fieldQuery={fieldQueryByKey.get('selection_method')}
                  label='Selection Method'
                  value={app.selection_method}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('selection_method')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='shop_option'
                  canQuery={canQueryField('shop_option')}
                  fieldQuery={fieldQueryByKey.get('shop_option')}
                  label='Booth/Stall Option'
                  value={app.shop_option_label ?? '—'}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('shop_option')}
                />
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='submitted_at'
                  canQuery={canQueryField('submitted_at')}
                  fieldQuery={fieldQueryByKey.get('submitted_at')}
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
                    canQuery={canQueryField('work_purpose')}
                    fieldQuery={fieldQueryByKey.get('work_purpose')}
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
                    canQuery={canQueryField('achievement_experience')}
                    fieldQuery={fieldQueryByKey.get('achievement_experience')}
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
                    canQuery={canQueryField('remarks')}
                    fieldQuery={fieldQueryByKey.get('remarks')}
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
                    {sectionFields.map((fv, idx) => {
                      const fieldKey = `dynamic:${fv.field_definition_id}`
                      const isFull = fv.input_type === 'textarea' || fv.input_type === 'multiselect'

                      // Anchored documents only ever attach at the actual
                      // LAST field of this section (for this specific
                      // application's own field list), never a field in the
                      // middle — resolved here against the real per-section
                      // field order instead of baking "is this the last
                      // field" into DOCUMENT_FIELD_ANCHORS itself, which
                      // would otherwise double-render a document when the
                      // same field_key is reused by another category where
                      // it ISN'T the last field (e.g. business_firm_name is
                      // Sweets' only/last Business Details field, but
                      // Refreshment Stalls' first one).
                      const isLastInSection = idx === sectionFields.length - 1
                      const anchoredDocuments = isLastInSection ? findAnchoredDocuments(fv.field_key) : []

                      return (
                        <Fragment key={fieldKey}>
                          <ApplicationFieldRow
                            applicationId={id}
                            fieldKey={fieldKey}
                            canQuery={canQueryField(fieldKey)}
                            fieldQuery={fieldQueryByKey.get(fieldKey)}
                            label={fv.label}
                            value={fv.value}
                            full={isFull}
                            canCheck={canVerifyDocuments}
                            initiallyChecked={checkedFieldKeys.has(fieldKey)}
                          />
                          {anchoredDocuments.map(doc => (
                            <PersonalDocumentCard
                              key={doc.id}
                              document={doc}
                              canVerifyDocuments={canVerifyDocuments}
                              previousVersions={documentVersionsByDocumentId.get(doc.id) ?? []}
                            />
                          ))}
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
            documentVersionsByDocumentId={documentVersionsByDocumentId}
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
              allotmentLetterReleasedAt={app.allotment_letter_released_at}
              canReleaseAllotmentLetter={!!permissions?.has('allotment:perform')}
            />
          </TabsContent>
        )}

        <TabsContent value='audit'>
          <ApplicationHistoryTab history={historyTimeline} />
        </TabsContent>
      </ApplicationTabsNav>
    </div>
  )
}

const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={`mb-3 text-xs font-bold uppercase tracking-wider text-[#8c5711] ${className ?? ''}`}>{children}</p>
)

export default ApplicationDetailPage
