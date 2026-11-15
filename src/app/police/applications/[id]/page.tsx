import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeftIcon,
  ShieldCheckIcon,
  StoreIcon,
  UserCheckIcon,
  FileTextIcon,
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  ExternalLinkIcon,
  Building2Icon,
  CalendarIcon,
  TagIcon,
  BadgeCheckIcon,
  CompassIcon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { query } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'
import PolicePrintDossierButton from '@/views/police/PolicePrintDossierButton'

export const metadata: Metadata = {
  title: 'Police Verification — Candidate Full Dossier'
}

type PoliceAppDetailRow = {
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
  shop_option_label: string | null
  stall_number: string | null
  shop_type: string | null
  direction: string | null
}

type DocRow = {
  id: number
  label: string
  original_filename: string
  mime_type: string
  verification_status: string
  created_at: string
}

export default async function PoliceApplicationDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('police:view')

  const { id } = await params
  const applicationId = decodeId(id)

  if (applicationId === null) notFound()

  const [appRows, documents, fieldValues] = await Promise.all([
    query<PoliceAppDetailRow[]>(
      `SELECT a.id, a.application_number, a.status, a.email, a.organisation_name, a.representative_name,
              a.father_name, a.police_station_name, a.police_station_address,
              a.aadhaar_last4, a.aadhaar_ciphertext, a.address, a.state, a.district, a.pin_code,
              a.mobile_number, a.alternate_mobile, a.work_purpose, a.achievement_experience, a.remarks,
              a.submitted_at, a.created_at,
              c.id AS category_id, c.name AS category_name, c.slug AS category_slug, c.selection_method,
              so.label AS shop_option_label,
              COALESCE(su.stall_number, su_direct.stall_number) AS stall_number,
              COALESCE(su.shop_type, su_direct.shop_type) AS shop_type,
              COALESCE(su.direction, su_direct.direction) AS direction
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options so ON so.id = a.shop_option_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       LEFT JOIN direct_allotments da ON da.application_id = a.id AND da.status = 'active'
       LEFT JOIN shop_units su_direct ON su_direct.id = da.shop_unit_id
       WHERE a.id = ? AND (a.status IN ('selected', 'allotted', 're_allotted', 'payment_required') OR su.status = 'allotted' OR su_direct.status = 'allotted' OR da.id IS NOT NULL)`,
      [applicationId]
    ),
    query<DocRow[]>(
      `SELECT ad.id, cdd.label, ad.original_filename, ad.mime_type, ad.verification_status, ad.created_at
       FROM application_documents ad
       JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
       WHERE ad.application_id = ?
       ORDER BY cdd.display_order ASC`,
      [applicationId]
    ),
    query<Array<{ label: string; value: string }>>(
      `SELECT cfd.label, afv.value
       FROM application_field_values afv
       JOIN category_field_definitions cfd ON cfd.id = afv.field_definition_id
       WHERE afv.application_id = ?
       ORDER BY cfd.display_order ASC`,
      [applicationId]
    )
  ])

  const app = appRows[0]
  if (!app) notFound()

  // Decrypt Aadhaar safely for police verification
  let aadhaarNumber = `•••• •••• ${app.aadhaar_last4}`
  try {
    const raw = decryptAadhaar(app.aadhaar_ciphertext)
    if (raw && raw.length === 12) {
      aadhaarNumber = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
    }
  } catch {
    // Keep masked fallback
  }

  return (
    <div className='flex flex-col gap-6 max-w-6xl mx-auto pb-12'>
      {/* Navigation & Header Breadcrumb */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Link
          href='/police/dashboard'
          className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0c2847] transition group'
        >
          <ArrowLeftIcon className='size-3.5 group-hover:-translate-x-0.5 transition-transform' />
          Back to Allotted Candidates
        </Link>

        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-1.5 text-xs font-mono font-semibold bg-blue-50 text-[#0c2847] border border-blue-200 px-3 py-1 rounded-md shadow-2xs'>
            <ShieldCheckIcon className='size-3.5 text-blue-700' />
            Police Security Dossier · {app.application_number}
          </span>
        </div>
      </div>

      {/* Main Candidate Dossier Header Banner */}
      <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-xs'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
          {/* Candidate Primary Info */}
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center gap-2.5'>
              <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800'>
                <BadgeCheckIcon className='size-3.5' /> Allotted &amp; Confirmed
              </span>
              <span className='inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800'>
                {app.category_name}
              </span>
              <span className='text-xs font-mono text-muted-foreground'>
                App: <strong className='text-[#0c2847]'>{app.application_number}</strong>
              </span>
            </div>

            <div>
              <h1 className='text-2xl font-bold tracking-tight text-[#0c2847] flex flex-wrap items-baseline gap-2'>
                {app.representative_name}
                {app.organisation_name && app.organisation_name !== '—' && (
                  <span className='text-base font-normal text-muted-foreground'>
                    ({app.organisation_name})
                  </span>
                )}
              </h1>
              <p className='text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3'>
                <span>
                  Father / Husband: <strong className='text-slate-700 font-semibold'>{app.father_name}</strong>
                </span>
                <span>·</span>
                <span>
                  Submitted:{' '}
                  <strong className='text-slate-700 font-semibold'>
                    {app.submitted_at
                      ? new Date(app.submitted_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          {/* Stall Allocation Card & Print Button */}
          <div className='flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0'>
            {app.stall_number ? (
              <div className='rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 text-left sm:text-right w-full sm:w-auto'>
                <p className='text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1 sm:justify-end'>
                  <StoreIcon className='size-3' />
                  Allotted Stall / Booth
                </p>
                <p className='text-xl font-mono font-bold text-[#0c2847] mt-0.5'>
                  Stall #{app.stall_number}
                </p>
                {(app.direction || app.shop_type) && (
                  <p className='text-xs text-slate-600 mt-0.5 capitalize'>
                    {[
                      app.direction ? `${app.direction} Facing` : null,
                      app.shop_type ? app.shop_type : null
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            ) : (
              <div className='rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800'>
                Stall Allotment Pending
              </div>
            )}

            <div className='w-full sm:w-auto flex justify-end'>
              <PolicePrintDossierButton />
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Executive Information Cards */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Card 1: Identity & Contact Verification */}
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/60 py-3.5 px-5'>
            <CardTitle className='text-sm font-bold text-[#0c2847] flex items-center gap-2'>
              <UserCheckIcon className='size-4 text-blue-700' />
              Candidate Identity &amp; Contact Details
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground'>
              Official identity and contact parameters registered for festival stall possession.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-5 space-y-4 text-xs'>
            <div className='grid grid-cols-2 gap-4 pb-3 border-b border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                  Allottee Name
                </span>
                <span className='font-bold text-slate-900 text-sm mt-0.5 block'>{app.representative_name}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                  Father&apos;s / Husband&apos;s Name
                </span>
                <span className='font-semibold text-slate-800 text-sm mt-0.5 block'>{app.father_name}</span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4 pb-3 border-b border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                  Aadhaar Number
                </span>
                <span className='font-mono font-bold text-[#0c2847] text-sm bg-slate-100 px-2 py-0.5 rounded mt-0.5 inline-block'>
                  {aadhaarNumber}
                </span>
                <span className='text-[10px] text-emerald-700 font-semibold block mt-1'>
                  ✓ Verified for Police Inspection
                </span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                  Firm / Organisation Name
                </span>
                <span className='font-semibold text-slate-800 mt-0.5 block'>
                  {app.organisation_name && app.organisation_name !== '—' ? app.organisation_name : 'Individual Applicant'}
                </span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4 pb-3 border-b border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                  Primary Contact (Mobile)
                </span>
                <a
                  href={`tel:${app.mobile_number}`}
                  className='font-mono font-bold text-slate-900 hover:text-blue-700 transition mt-0.5 inline-flex items-center gap-1.5'
                >
                  <PhoneIcon className='size-3 text-slate-400' />
                  +91 {app.mobile_number}
                </a>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                  Alternate Contact
                </span>
                {app.alternate_mobile ? (
                  <a
                    href={`tel:${app.alternate_mobile}`}
                    className='font-mono font-medium text-slate-700 hover:text-blue-700 transition mt-0.5 inline-flex items-center gap-1.5'
                  >
                    <PhoneIcon className='size-3 text-slate-400' />
                    +91 {app.alternate_mobile}
                  </a>
                ) : (
                  <span className='text-slate-400 mt-0.5 block'>—</span>
                )}
              </div>
            </div>

            <div>
              <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                Email Address
              </span>
              <a
                href={`mailto:${app.email}`}
                className='font-medium text-slate-800 hover:text-blue-700 transition mt-0.5 inline-flex items-center gap-1.5'
              >
                <MailIcon className='size-3 text-slate-400' />
                {app.email}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Residential Address & Police Jurisdiction */}
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/60 py-3.5 px-5'>
            <CardTitle className='text-sm font-bold text-[#0c2847] flex items-center gap-2'>
              <MapPinIcon className='size-4 text-rose-600' />
              Permanent Address &amp; Police Jurisdiction
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground'>
              Designated native police station and residential credentials for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-5 space-y-4 text-xs'>
            <div>
              <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                Permanent Residential Address
              </span>
              <p className='font-medium text-slate-900 leading-relaxed mt-1'>{app.address}</p>
            </div>

            <div className='grid grid-cols-3 gap-3 pb-3 border-b border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>District</span>
                <span className='font-bold text-slate-900 mt-0.5 block'>{app.district}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>State</span>
                <span className='font-bold text-slate-900 mt-0.5 block'>{app.state}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>PIN Code</span>
                <span className='font-mono font-bold text-slate-900 mt-0.5 block'>{app.pin_code || '—'}</span>
              </div>
            </div>

            {/* Designated Police Station Callout Box */}
            <div className='rounded-lg border border-blue-200 bg-blue-50/50 p-3.5'>
              <div className='flex items-center gap-1.5 mb-1'>
                <ShieldCheckIcon className='size-3.5 text-blue-700' />
                <span className='text-[11px] font-bold uppercase tracking-wider text-blue-900'>
                  Designated Police Station
                </span>
              </div>
              <p className='font-bold text-slate-900 text-sm'>{app.police_station_name}</p>
              {app.police_station_address && (
                <p className='text-slate-600 text-xs mt-1 leading-relaxed'>{app.police_station_address}</p>
              )}
            </div>

            {/* Work Purpose / Experience */}
            {(app.work_purpose || app.achievement_experience) && (
              <div className='pt-1 space-y-2'>
                {app.work_purpose && (
                  <div>
                    <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                      Stated Purpose / Craft Type
                    </span>
                    <p className='text-slate-700 mt-0.5 leading-relaxed'>{app.work_purpose}</p>
                  </div>
                )}
                {app.achievement_experience && (
                  <div className='pt-2 border-t border-slate-100'>
                    <span className='text-slate-400 block text-[11px] font-semibold uppercase tracking-wider'>
                      Experience / Background
                    </span>
                    <p className='text-slate-700 mt-0.5 leading-relaxed'>{app.achievement_experience}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Specific Declarations (if any) */}
      {fieldValues.length > 0 && (
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/60 py-3.5 px-5'>
            <CardTitle className='text-sm font-bold text-[#0c2847] flex items-center gap-2'>
              <TagIcon className='size-4 text-purple-600' />
              Category Declarations &amp; Custom Attributes
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground'>
              Specific technical criteria, artisan certificates, or trade details provided by the candidate.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-5'>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs'>
              {fieldValues.map((fv, i) => (
                <div key={i} className='rounded-lg border border-slate-200 bg-slate-50/60 p-3'>
                  <span className='text-slate-500 block text-[11px] font-semibold'>{fv.label}</span>
                  <span className='font-semibold text-slate-900 mt-1 block break-words'>
                    {fv.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Verification Documents & Identity Proofs */}
      <Card className='shadow-xs border-slate-200'>
        <CardHeader className='border-b bg-slate-50/60 py-3.5 px-5 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-sm font-bold text-[#0c2847] flex items-center gap-2'>
              <FileTextIcon className='size-4 text-amber-600' />
              Uploaded Proofs &amp; Identity Documents ({documents.length})
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground'>
              Candidate uploaded certificates, government IDs, and supporting verification files.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='p-5'>
          {documents.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground'>
              <FileTextIcon className='size-8 mx-auto text-muted-foreground/40 mb-2' />
              <p className='text-xs font-semibold'>No document uploads found for this application.</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {documents.map(doc => {
                const previewUrl = `/api/documents/${doc.id}/preview`

                return (
                  <div
                    key={doc.id}
                    className='rounded-xl border border-slate-200 bg-slate-50/40 p-4 hover:bg-white hover:border-blue-300 hover:shadow-xs transition flex flex-col justify-between gap-3'
                  >
                    <div>
                      <div className='flex items-center justify-between gap-2 mb-1.5'>
                        <span className='font-bold text-xs text-[#0c2847] truncate' title={doc.label}>
                          {doc.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase rounded-md px-2 py-0.5 ${
                            doc.verification_status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.verification_status === 'query'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {doc.verification_status}
                        </span>
                      </div>
                      <p className='text-[11px] text-muted-foreground font-mono truncate' title={doc.original_filename}>
                        {doc.original_filename}
                      </p>
                    </div>

                    <a
                      href={previewUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-[#0c2847] rounded-lg transition shadow-2xs group'
                    >
                      <ExternalLinkIcon className='size-3.5 text-blue-700 group-hover:scale-110 transition-transform' />
                      Preview Document
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
