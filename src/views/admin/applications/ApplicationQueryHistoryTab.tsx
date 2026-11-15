'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  ExternalLinkIcon,
  HistoryIcon,
  HelpCircleIcon,
  XCircleIcon,
  FilterIcon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type QueryHistoryFieldItem = {
  id: number
  fieldKey: string
  fieldLabel: string
  remarks: string
  status: 'open' | 'responded' | 'cancelled'
  previousValue: string | null
  newValue: string | null
  applicantNotes: string | null
  createdAt: string
  respondedAt: string | null
}

export type QueryHistoryDocVersion = {
  id: number
  original_filename: string
  verification_status: string
  verification_remarks: string | null
  superseded_at: string
}

export type QueryHistoryDocItem = {
  id: number | null
  documentKey: string
  label: string
  originalFilename: string | null
  verificationStatus: string | null
  verificationRemarks: string | null
  reuploadNotes: string | null
  verifiedAt: string | null
  reuploadedAt: string | null
  createdAt: string | null
  versions: QueryHistoryDocVersion[]
}

export type QueryHistoryAppItem = {
  id: number
  remarks: string
  createdAt: string
}

interface ApplicationQueryHistoryTabProps {
  fieldQueries: QueryHistoryFieldItem[]
  docQueries: QueryHistoryDocItem[]
  applicationQueries?: QueryHistoryAppItem[]
}

function formatDateTime(val: string | null | undefined): string {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ApplicationQueryHistoryTab({
  fieldQueries,
  docQueries,
  applicationQueries = []
}: ApplicationQueryHistoryTabProps) {
  const [filter, setFilter] = useState<'all' | 'fields' | 'documents'>('all')

  const totalFields = fieldQueries.length
  const openFields = fieldQueries.filter(q => q.status === 'open').length
  const respondedFields = fieldQueries.filter(q => q.status === 'responded').length

  const totalDocs = docQueries.length
  const openDocs = docQueries.filter(d => d.verificationStatus === 'query').length
  const resolvedDocs = docQueries.filter(d => d.reuploadedAt !== null || d.verificationStatus === 'verified').length

  const totalQueries = totalFields + totalDocs + applicationQueries.length
  const totalOpen = openFields + openDocs

  const visibleFieldQueries = filter === 'documents' ? [] : fieldQueries
  const visibleDocQueries = filter === 'fields' ? [] : docQueries

  if (totalQueries === 0) {
    return (
      <Card className='shadow-xs'>
        <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
          <div className='flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
            <CheckCircle2Icon className='size-6 text-emerald-600' />
          </div>
          <h3 className='mt-3 text-base font-semibold text-[#0c2847]'>No Queries Raised</h3>
          <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
            No field corrections or document queries have been raised for this application.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Overview Cards */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <Card className='shadow-xs border-slate-200'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-slate-500'>Total Queries</span>
              <HistoryIcon className='size-4 text-slate-400' />
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className='text-2xl font-bold text-[#0c2847]'>{totalQueries}</span>
              <span className='text-[11px] text-muted-foreground'>
                ({totalFields} fields, {totalDocs} docs)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-xs border-slate-200 ${totalOpen > 0 ? 'bg-amber-50/40 border-amber-200' : ''}`}>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-slate-600'>Pending with Applicant</span>
              <AlertCircleIcon className={`size-4 ${totalOpen > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className={`text-2xl font-bold ${totalOpen > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                {totalOpen}
              </span>
              <span className='text-[11px] text-muted-foreground'>
                ({openFields} fields, {openDocs} docs)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs border-slate-200'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-slate-500'>Responded / Corrected</span>
              <CheckCircle2Icon className='size-4 text-emerald-600' />
            </div>
            <div className='mt-2 flex items-baseline gap-2'>
              <span className='text-2xl font-bold text-emerald-800'>{respondedFields + resolvedDocs}</span>
              <span className='text-[11px] text-muted-foreground'>
                ({respondedFields} fields, {resolvedDocs} docs)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter pills */}
      <div className='flex flex-wrap items-center justify-between gap-2 border-b pb-3'>
        <div className='flex items-center gap-1.5'>
          <FilterIcon className='size-3.5 text-slate-400' />
          <span className='text-xs font-semibold text-slate-600'>Filter View:</span>
          <div className='inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs'>
            <button
              type='button'
              onClick={() => setFilter('all')}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${
                filter === 'all' ? 'bg-white text-[#0c2847] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Queries ({totalQueries})
            </button>
            <button
              type='button'
              onClick={() => setFilter('fields')}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${
                filter === 'fields' ? 'bg-white text-[#0c2847] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Field Details ({totalFields})
            </button>
            <button
              type='button'
              onClick={() => setFilter('documents')}
              className={`rounded-md px-2.5 py-1 font-semibold transition ${
                filter === 'documents' ? 'bg-white text-[#0c2847] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Documents ({totalDocs})
            </button>
          </div>
        </div>
      </div>

      {/* Application-level queries (if any) */}
      {applicationQueries.length > 0 && filter !== 'fields' && filter !== 'documents' && (
        <Card className='border-amber-200 bg-amber-50/30 shadow-xs'>
          <CardHeader className='pb-2 pt-4 px-4'>
            <CardTitle className='text-sm font-bold text-amber-950 flex items-center gap-2'>
              <AlertCircleIcon className='size-4 text-amber-600' />
              Whole Application Query History
            </CardTitle>
          </CardHeader>
          <CardContent className='p-4 pt-1 flex flex-col gap-2'>
            {applicationQueries.map(q => (
              <div key={q.id} className='rounded-md border border-amber-200/80 bg-white p-3 text-xs'>
                <div className='flex items-center justify-between text-slate-500'>
                  <span className='font-semibold text-amber-900'>General Query Remark</span>
                  <span>{formatDateTime(q.createdAt)}</span>
                </div>
                <p className='mt-1 text-slate-800 font-medium'>{q.remarks}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Field / Detail Queries Section */}
      {visibleFieldQueries.length > 0 && (
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='pb-3 pt-4 px-4 border-b border-slate-100 bg-slate-50/50'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-sm font-bold text-[#0c2847] flex items-center gap-2'>
                  <FileTextIcon className='size-4 text-blue-600' />
                  Application Field Corrections ({visibleFieldQueries.length})
                </CardTitle>
                <CardDescription className='text-xs mt-0.5'>
                  History of specific application form fields requested for review and corrected by the applicant.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-4 flex flex-col gap-3.5 divide-y divide-slate-100'>
            {visibleFieldQueries.map(q => {
              const isOpen = q.status === 'open'
              const isResponded = q.status === 'responded'
              const isCancelled = q.status === 'cancelled'

              return (
                <div key={q.id} className='pt-3 first:pt-0 flex flex-col gap-2.5'>
                  {/* Top Bar: Field Name + Status + Date */}
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold text-sm text-[#0c2847]'>{q.fieldLabel}</span>
                      <span className='text-[11px] font-mono text-slate-400'>({q.fieldKey})</span>
                    </div>

                    <div className='flex items-center gap-2'>
                      {isOpen && (
                        <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1'>
                          <ClockIcon className='size-3' /> Pending Correction
                        </span>
                      )}
                      {isResponded && (
                        <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1'>
                          <CheckCircle2Icon className='size-3' /> Corrected by Applicant
                        </span>
                      )}
                      {isCancelled && (
                        <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 flex items-center gap-1'>
                          <XCircleIcon className='size-3' /> Cancelled
                        </span>
                      )}
                      <span className='text-[11px] text-slate-500'>{formatDateTime(q.createdAt)}</span>
                    </div>
                  </div>

                  {/* Reviewer Query Remark */}
                  <div className='rounded-md border border-amber-200/70 bg-amber-50/50 p-2.5 text-xs'>
                    <span className='font-semibold text-amber-900'>Reviewer Query / Remark:</span>{' '}
                    <span className='text-amber-950'>{q.remarks}</span>
                  </div>

                  {/* Values Diff (Previous vs New) */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                    <div className='rounded-md border border-slate-200 bg-slate-50/80 p-2.5 text-xs'>
                      <span className='block text-[11px] font-semibold text-slate-500 mb-1'>
                        Previous Value (पहले भरा गया मान):
                      </span>
                      <div className='font-mono font-medium text-slate-600 line-through break-words'>
                        {q.previousValue || <span className='text-slate-400 not-italic no-underline'>[Empty / Not Provided]</span>}
                      </div>
                    </div>

                    <div
                      className={`rounded-md border p-2.5 text-xs ${
                        isResponded
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className='block text-[11px] font-semibold text-slate-500 mb-1'>
                        {isResponded ? 'Corrected Value (नया मान):' : 'Updated Value:'}
                      </span>
                      <div className='font-mono font-bold text-[#0c2847] break-words'>
                        {isResponded ? (
                          q.newValue || <span className='text-slate-400 font-normal'>—</span>
                        ) : isOpen ? (
                          <span className='text-amber-700 italic font-normal'>Awaiting applicant submission...</span>
                        ) : (
                          q.newValue || '—'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Applicant Notes & Response Time */}
                  {isResponded && (
                    <div className='rounded-md border border-blue-100 bg-blue-50/50 p-2.5 text-xs text-blue-900 flex flex-col gap-1'>
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-blue-950'>Applicant's Reply / Notes:</span>
                        {q.respondedAt && (
                          <span className='text-[10px] text-blue-700'>{formatDateTime(q.respondedAt)}</span>
                        )}
                      </div>
                      <p className='text-blue-900'>{q.applicantNotes || 'Details updated as requested.'}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Document Queries Section */}
      {visibleDocQueries.length > 0 && (
        <Card className='shadow-xs border-slate-200'>
          <CardHeader className='pb-3 pt-4 px-4 border-b border-slate-100 bg-slate-50/50'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-sm font-bold text-[#0c2847] flex items-center gap-2'>
                  <FileTextIcon className='size-4 text-amber-600' />
                  Document Query & Re-upload History ({visibleDocQueries.length})
                </CardTitle>
                <CardDescription className='text-xs mt-0.5'>
                  Documents with verification remarks, re-upload requests, or version replacements.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-4 flex flex-col gap-4 divide-y divide-slate-100'>
            {visibleDocQueries.map(doc => {
              const isDocOpen = doc.verificationStatus === 'query'
              const isReuploaded = Boolean(doc.reuploadedAt)
              const isVerified = doc.verificationStatus === 'verified'

              return (
                <div key={doc.documentKey} className='pt-3.5 first:pt-0 flex flex-col gap-2.5'>
                  {/* Top Bar: Doc Name + Status */}
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div>
                      <span className='font-bold text-sm text-[#0c2847]'>{doc.label}</span>
                      <span className='block text-xs text-slate-500 font-mono mt-0.5'>
                        {doc.originalFilename || 'No file uploaded yet'}
                      </span>
                    </div>

                    <div className='flex items-center gap-2'>
                      {isDocOpen && (
                        <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 flex items-center gap-1'>
                          <ClockIcon className='size-3' /> Query Raised
                        </span>
                      )}
                      {isReuploaded && !isVerified && (
                        <span className='rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200 flex items-center gap-1'>
                          <CheckCircle2Icon className='size-3' /> Re-uploaded (Under Review)
                        </span>
                      )}
                      {isVerified && (
                        <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1'>
                          <CheckCircle2Icon className='size-3' /> Verified
                        </span>
                      )}
                      {doc.id && (
                        <a
                          href={`/api/documents/${doc.id}/preview`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-[#0c2847] hover:bg-slate-50 transition'
                        >
                          <ExternalLinkIcon className='size-3' /> Preview File
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Reviewer Query Remark */}
                  {doc.verificationRemarks && (
                    <div className='rounded-md border border-amber-200/70 bg-amber-50/50 p-2.5 text-xs'>
                      <span className='font-semibold text-amber-900'>Reviewer Query / Remark:</span>{' '}
                      <span className='text-amber-950'>{doc.verificationRemarks}</span>
                      {doc.verifiedAt && (
                        <span className='block text-[10px] text-amber-700/80 mt-1'>
                          Raised on: {formatDateTime(doc.verifiedAt)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Applicant Re-upload Note */}
                  {doc.reuploadNotes && (
                    <div className='rounded-md border border-blue-100 bg-blue-50/50 p-2.5 text-xs text-blue-900 flex flex-col gap-0.5'>
                      <div className='flex items-center justify-between'>
                        <span className='font-bold text-blue-950'>Applicant's Re-upload Note:</span>
                        {doc.reuploadedAt && (
                          <span className='text-[10px] text-blue-700'>{formatDateTime(doc.reuploadedAt)}</span>
                        )}
                      </div>
                      <p>{doc.reuploadNotes}</p>
                    </div>
                  )}

                  {/* Superseded Versions Trail (if any) */}
                  {doc.versions && doc.versions.length > 0 && (
                    <div className='mt-1 rounded-md border border-slate-200 bg-slate-50/60 p-2.5'>
                      <span className='text-[11px] font-bold text-slate-600 block mb-1.5'>
                        Previous Superseded Versions ({doc.versions.length}):
                      </span>
                      <div className='flex flex-col gap-1.5'>
                        {doc.versions.map(v => (
                          <div
                            key={v.id}
                            className='flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-xs'
                          >
                            <div>
                              <span className='font-mono font-medium text-slate-700'>{v.original_filename}</span>
                              {v.verification_remarks && (
                                <span className='block text-[11px] text-amber-700 mt-0.5'>
                                  Query remark: {v.verification_remarks}
                                </span>
                              )}
                            </div>
                            <div className='flex items-center gap-2'>
                              <span className='text-[10px] text-slate-400'>
                                Superseded: {formatDateTime(v.superseded_at)}
                              </span>
                              <a
                                href={`/api/documents/versions/${v.id}/preview`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline'
                              >
                                View <ExternalLinkIcon className='size-2.5' />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

