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
  DownloadIcon,
  CheckCircle2Icon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { query } from '@/lib/db/client'
import { decryptAadhaar } from '@/lib/applications/aadhaar-crypto'
import { requirePermission } from '@/lib/rbac/authorize'
import { decodeId } from '@/lib/security/opaque-id'
import ApplicationPdfDownloads from '@/views/admin/applications/ApplicationPdfDownloads'

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
              su.stall_number, su.shop_type, su.direction
       FROM applications a
       JOIN categories c ON c.id = a.category_id
       LEFT JOIN category_shop_options so ON so.id = a.shop_option_id
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       WHERE a.id = ? AND a.status IN ('selected', 'allotted', 're_allotted')`,
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

  // Decrypt Aadhaar safely
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
    <div className='flex flex-col gap-6 max-w-5xl mx-auto'>
      {/* Navigation header */}
      <div className='flex items-center justify-between'>
        <Link
          href='/police/dashboard'
          className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition'
        >
          <ArrowLeftIcon className='size-3.5' /> Back to Allotted Candidates
        </Link>

        <span className='text-xs font-mono bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-md font-semibold'>
          Police Record Dossier #{app.application_number}
        </span>
      </div>

      {/* Main Dossier Header Card */}
      <div className='bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Badge className='bg-emerald-600 text-white font-bold text-xs uppercase px-2.5 py-0.5'>
              {app.status}
            </Badge>
            <span className='text-xs text-slate-500 font-medium'>
              Category: <strong className='text-slate-800'>{app.category_name}</strong>
            </span>
          </div>

          <h1 className='text-2xl font-bold text-slate-900 flex items-center gap-3'>
            {app.representative_name}
            {app.organisation_name && app.organisation_name !== '—' && (
              <span className='text-base font-normal text-slate-500'>({app.organisation_name})</span>
            )}
          </h1>
          <p className='text-xs text-slate-500 mt-0.5'>
            S/O, D/O: <strong>{app.father_name}</strong> · Submitted on:{' '}
            {app.submitted_at ? new Date(app.submitted_at).toLocaleString('en-IN') : 'N/A'}
          </p>
        </div>

        {/* Stall & Print Buttons */}
        <div className='flex flex-col items-end gap-2 w-full md:w-auto'>
          {app.stall_number ? (
            <div className='px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-right w-full md:w-auto'>
              <span className='text-[10px] text-blue-600 font-bold uppercase tracking-wider block'>
                Allotted Booth/Stall
              </span>
              <span className='text-lg font-mono font-bold text-blue-950'>
                Stall #{app.stall_number}
              </span>
              {app.direction && (
                <span className='text-[11px] text-slate-500 block'>Direction: {app.direction}</span>
              )}
            </div>
          ) : (
            <Badge variant='outline' className='text-xs text-amber-700 bg-amber-50 border-amber-300'>
              Booth/Stall Allotment Pending
            </Badge>
          )}

          <div className='pt-1'>
            <ApplicationPdfDownloads applicationId={id} />
          </div>
        </div>
      </div>

      {/* Identity & Address Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Personal & Identity Card */}
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/70 py-3.5 px-5'>
            <CardTitle className='text-sm font-bold text-slate-900 flex items-center gap-2'>
              <UserCheckIcon className='size-4 text-blue-600' />
              Personal & Identity Verification
            </CardTitle>
          </CardHeader>
          <CardContent className='p-5 space-y-3.5 text-xs'>
            <div className='grid grid-cols-2 gap-3 pb-3 border-b border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Full Name</span>
                <span className='font-bold text-slate-900 text-sm'>{app.representative_name}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Father&apos;s Name</span>
                <span className='font-semibold text-slate-800 text-sm'>{app.father_name}</span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 pb-3 border-b border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Aadhaar Number</span>
                <span className='font-mono font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded'>
                  {aadhaarNumber}
                </span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Firm / Organisation</span>
                <span className='font-medium text-slate-800'>{app.organisation_name || 'Individual'}</span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Mobile Number</span>
                <span className='font-mono font-bold text-slate-900'>+91 {app.mobile_number}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Alternate Contact</span>
                <span className='font-mono text-slate-700'>
                  {app.alternate_mobile ? `+91 ${app.alternate_mobile}` : '—'}
                </span>
              </div>
            </div>

            <div>
              <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Email Address</span>
              <span className='font-medium text-slate-800'>{app.email}</span>
            </div>
          </CardContent>
        </Card>

        {/* Address & Origin Card */}
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/70 py-3.5 px-5'>
            <CardTitle className='text-sm font-bold text-slate-900 flex items-center gap-2'>
              <MapPinIcon className='size-4 text-red-600' />
              Permanent Address & Origin
            </CardTitle>
          </CardHeader>
          <CardContent className='p-5 space-y-3.5 text-xs'>
            <div>
              <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Residential Address</span>
              <p className='font-medium text-slate-800 leading-relaxed mt-0.5'>{app.address}</p>
            </div>

            <div className='grid grid-cols-3 gap-3 pt-2 border-t border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>District</span>
                <span className='font-semibold text-slate-900'>{app.district}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>State</span>
                <span className='font-semibold text-slate-900'>{app.state}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>PIN Code</span>
                <span className='font-mono font-bold text-slate-900'>{app.pin_code}</span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 pt-2 border-t border-slate-100'>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Police Station Name</span>
                <span className='font-semibold text-slate-800 text-sm'>{app.police_station_name}</span>
              </div>
              <div>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>Police Station Address</span>
                <span className='font-medium text-slate-800 text-sm'>{app.police_station_address}</span>
              </div>
            </div>

            <div className='pt-2 border-t border-slate-100'>
              <span className='text-slate-400 block text-[11px] uppercase font-semibold'>
                Stated Purpose of Work
              </span>
              <p className='text-slate-700 italic mt-0.5'>{app.work_purpose}</p>
            </div>

            {app.achievement_experience && (
              <div className='pt-2 border-t border-slate-100'>
                <span className='text-slate-400 block text-[11px] uppercase font-semibold'>
                  Experience / Background
                </span>
                <p className='text-slate-700 mt-0.5'>{app.achievement_experience}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Specific Form Answers (if any) */}
      {fieldValues.length > 0 && (
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='border-b bg-slate-50/70 py-3 px-5'>
            <CardTitle className='text-sm font-bold text-slate-900'>
              Category Declarations & Attributes
            </CardTitle>
          </CardHeader>
          <CardContent className='p-5'>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs'>
              {fieldValues.map((fv, i) => (
                <div key={i} className='bg-slate-50 p-2.5 rounded-lg border border-slate-100'>
                  <span className='text-slate-500 block text-[11px] font-semibold'>{fv.label}</span>
                  <span className='font-medium text-slate-900 mt-0.5 block'>{fv.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents & Identity Proofs */}
      <Card className='shadow-xs border-slate-200'>
        <CardHeader className='border-b bg-slate-50/70 py-3.5 px-5 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-sm font-bold text-slate-900 flex items-center gap-2'>
              <FileTextIcon className='size-4 text-amber-600' />
              Uploaded Proofs & Documents ({documents.length})
            </CardTitle>
            <CardDescription className='text-xs text-slate-500'>
              Inspect candidate uploaded verification documents and credentials.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='p-5'>
          {documents.length === 0 ? (
            <p className='text-xs text-slate-400 py-4 text-center'>No document uploads found for this candidate.</p>
          ) : (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
              {documents.map(doc => {
                const previewUrl = `/api/documents/${doc.id}/preview`

                return (
                  <div
                    key={doc.id}
                    className='rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition flex flex-col justify-between gap-3'
                  >
                    <div>
                      <div className='flex items-center justify-between gap-2 mb-1.5'>
                        <span className='font-semibold text-xs text-slate-900 truncate'>{doc.label}</span>
                        <span className='text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-blue-100 text-blue-800'>
                          {doc.verification_status}
                        </span>
                      </div>
                      <p className='text-[11px] text-slate-500 font-mono truncate' title={doc.original_filename}>
                        {doc.original_filename}
                      </p>
                    </div>

                    <a
                      href={previewUrl}
                      target='_blank'
                      rel='noreferrer'
                      className='inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-blue-900 rounded-lg transition shadow-2xs'
                    >
                      <ExternalLinkIcon className='size-3.5 text-blue-600' /> View / Download Document
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
