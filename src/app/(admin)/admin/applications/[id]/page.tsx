import type { ReactNode } from 'react'

import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { query } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { getApprovalChecklist } from '@/lib/applications/approval-checklist'
import { getApplicationStatusConfig } from '@/lib/applications/status-config'
import { logAudit } from '@/lib/audit/log'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'
import ApplicationDecisionActions from '@/views/admin/applications/ApplicationDecisionActions'
import ApplicationFieldRow from '@/views/admin/applications/ApplicationFieldRow'
import ApplicationPdfDownloads from '@/views/admin/applications/ApplicationPdfDownloads'
import ApplicationDocumentsSection from '@/views/admin/documents/ApplicationDocumentsSection'
import PersonalDocumentCard from '@/views/admin/documents/PersonalDocumentCard'

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
  shop_option_label: string | null
}

const ApplicationDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const session = await requirePermission('application:view')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) notFound()

  const [rows, fieldValues, checkedFieldRows, documents, auditEntries, permissions, approvalChecklist] = await Promise.all([
    query<ApplicationRow[]>(
      `SELECT a.id, a.application_number, a.status, a.email, a.organisation_name, a.representative_name,
              a.father_name, a.aadhaar_last4, a.aadhaar_ciphertext, a.address, a.state, a.district, a.pin_code, a.mobile_number,
              a.alternate_mobile, a.work_purpose, a.achievement_experience, a.remarks, a.submitted_at, a.created_at,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.selection_method,
              so.label AS shop_option_label
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options so ON so.id = a.shop_option_id
       WHERE a.id = ?`,
      [applicationId]
    ),
    query<Array<{ field_definition_id: number; label: string; label_hi: string | null; value: string }>>(
      `SELECT cfd.id AS field_definition_id, cfd.label, cfd.label_hi, afv.value
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
        id: number
        document_key: string
        label: string
        original_filename: string
        verification_status: string
        verification_remarks: string | null
        verified_at: string | null
        reuploaded_at: string | null
        created_at: string
      }>
    >(
      `SELECT ad.id, cdd.document_key, cdd.label, ad.original_filename, ad.verification_status, ad.verification_remarks,
              ad.verified_at, ad.reuploaded_at, ad.created_at
       FROM application_documents ad
       JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
       WHERE ad.application_id = ?
       ORDER BY cdd.display_order ASC`,
      [applicationId]
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
    getApprovalChecklist(applicationId)
  ])

  const app = rows[0]

  if (!app) notFound()

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

  const canApprove =
    app.status === 'under_review' && !!permissions?.has('application:approve') && !!approvalChecklist?.allDocumentsVerified

  const canReject = (app.status === 'under_review' || app.status === 'query_raised') && !!permissions?.has('application:reject')
  const canVerifyDocuments = !!permissions?.has('document:verify')
  const checkedFieldKeys = new Set(checkedFieldRows.map(r => r.field_key))
  const aadhaarDocument = documents.find(d => d.document_key === 'aadhaar_card') ?? null

  const approvalBlockedByDocs =
    app.status === 'under_review' && !!permissions?.has('application:approve') && !approvalChecklist?.allDocumentsVerified

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-3'>
        <Link
          href='/admin/applications'
          className='inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#0c2847] transition'
        >
          <ArrowLeftIcon className='size-4' /> Back to Applications
        </Link>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='flex items-center gap-3 text-2xl font-bold tracking-tight text-[#0c2847]'>
              {app.application_number}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </h1>
            <p className='text-sm text-muted-foreground'>
              {app.representative_name} · {app.organisation_name} · {app.category_name}
            </p>
          </div>
        </div>

        <ApplicationPdfDownloads applicationId={id} />

        {approvalBlockedByDocs && (
          <p className='text-xs font-medium text-amber-700'>
            Approve will be available once every required document is verified
            {approvalChecklist && approvalChecklist.missingDocumentLabels.length > 0
              ? ` — still pending: ${approvalChecklist.missingDocumentLabels.join(', ')}.`
              : '.'}
          </p>
        )}

        <ApplicationDecisionActions applicationId={id} canApprove={canApprove} canReject={canReject} />
      </div>

      <Tabs defaultValue='personal'>
        <TabsList>
          <TabsTrigger value='personal'>Personal</TabsTrigger>
          <TabsTrigger value='application'>Application</TabsTrigger>
          <TabsTrigger value='documents'>Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value='selection'>Selection & Allotment</TabsTrigger>
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
                <ApplicationFieldRow
                  applicationId={id}
                  fieldKey='organisation_name'
                  label='Organisation / Firm Name'
                  value={app.organisation_name}
                  canCheck={canVerifyDocuments}
                  initiallyChecked={checkedFieldKeys.has('organisation_name')}
                />
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
                  label='Mobile Number'
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='application'>
          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base'>Application Details</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
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
              <ApplicationFieldRow
                applicationId={id}
                fieldKey='work_purpose'
                label='Purpose of Work'
                value={app.work_purpose}
                full
                canCheck={canVerifyDocuments}
                initiallyChecked={checkedFieldKeys.has('work_purpose')}
              />
              <ApplicationFieldRow
                applicationId={id}
                fieldKey='achievement_experience'
                label='Achievements / Experience'
                value={app.achievement_experience}
                full
                canCheck={canVerifyDocuments}
                initiallyChecked={checkedFieldKeys.has('achievement_experience')}
              />
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
              {fieldValues.map(fv => {
                const fieldKey = `dynamic:${fv.field_definition_id}`

                return (
                  <ApplicationFieldRow
                    key={fieldKey}
                    applicationId={id}
                    fieldKey={fieldKey}
                    label={fv.label}
                    value={fv.value}
                    canCheck={canVerifyDocuments}
                    initiallyChecked={checkedFieldKeys.has(fieldKey)}
                  />
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='documents'>
          <ApplicationDocumentsSection documents={documents} canVerifyDocuments={canVerifyDocuments} />
        </TabsContent>

        <TabsContent value='selection'>
          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base'>Selection & Allotment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>
                Current status: <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
              </p>
              <p className='mt-3 text-sm text-muted-foreground'>
                Draw participation, shop allotment, and the allotment letter/QR will appear here once this
                application reaches that stage.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

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
                        <span className='font-semibold text-[#0c2847]'>{entry.action}</span>
                        <span className='text-xs text-muted-foreground'>
                          {new Date(entry.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground'>Role: {entry.actor_role_key ?? 'system'}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={`mb-3 text-xs font-bold uppercase tracking-wider text-[#8c5711] ${className ?? ''}`}>{children}</p>
)

export default ApplicationDetailPage
