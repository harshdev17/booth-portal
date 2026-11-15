'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, HistoryIcon } from 'lucide-react'
import type { Language } from '@/context/LanguageContext'

export type FieldQueryTrailEntry = {
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

export type QueryTrailDocEntry = {
  documentKey: string
  label: string
  labelHi: string | null
  reuploadNotes?: string | null
  reuploadedAt?: string | null
}

export type QueryHistoryEntry = {
  documentLabel: string | null
  remarks: string
  createdAt: string
}

type Props = {
  lang: Language
  fieldQueryTrail?: FieldQueryTrailEntry[]
  queryHistory?: QueryHistoryEntry[]
  documents?: QueryTrailDocEntry[]
}

export const QueryTrailCard = ({ lang, fieldQueryTrail = [], queryHistory = [], documents = [] }: Props) => {
  const [isOpen, setIsOpen] = useState(false)

  const validQueryHistory = queryHistory.filter(
    entry => Boolean(entry.remarks && entry.remarks.trim() && entry.remarks !== 'null')
  )
  const reuploadedDocs = documents.filter(d => Boolean(d.reuploadNotes))
  const totalEntries = fieldQueryTrail.length + validQueryHistory.length + reuploadedDocs.length

  if (totalEntries === 0) return null

  return (
    <div id='query-trail' className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs scroll-mt-4'>
      <button
        type='button'
        onClick={() => setIsOpen(prev => !prev)}
        className='w-full px-5 py-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition-colors flex items-center justify-between text-left'
        aria-expanded={isOpen}
      >
        <div className='flex items-center gap-2'>
          <HistoryIcon className='size-4 text-[#0c2847]' />
          <span className='text-xs font-bold text-[#0c2847] uppercase tracking-wider'>
            {lang === 'hi' ? 'पिछला स्पष्टीकरण एवं सुधार इतिहास' : 'Past Query & Correction History'}
          </span>
          <span className='rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700'>
            {totalEntries}
          </span>
        </div>
        <div className='flex items-center gap-1.5 text-xs text-slate-500 font-medium'>
          <span>{isOpen ? (lang === 'hi' ? 'छुपाएं' : 'Hide') : (lang === 'hi' ? 'देखें' : 'View')}</span>
          {isOpen ? <ChevronUpIcon className='size-4 text-slate-500' /> : <ChevronDownIcon className='size-4 text-slate-500' />}
        </div>
      </button>

      {isOpen && (
        <div className='border-t border-slate-200 divide-y divide-slate-100 p-4 sm:p-5 flex flex-col gap-4'>
          {/* Field Queries Trail */}
          {fieldQueryTrail.length > 0 && (
            <div className='flex flex-col gap-2.5'>
              <p className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                {lang === 'hi' ? 'विवरण सुधार (फील्ड)' : 'Field Corrections'}
              </p>
              {fieldQueryTrail.map(fq => (
                <div key={`trail-fq-${fq.id}`} className='rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs'>
                  <div className='flex items-center justify-between gap-2 flex-wrap mb-2'>
                    <span className='font-bold text-slate-900 text-sm'>
                      {lang === 'hi' && fq.labelHi ? fq.labelHi : fq.label}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        fq.status === 'responded'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {fq.status === 'responded'
                        ? lang === 'hi' ? 'सुधारा गया' : 'Corrected'
                        : lang === 'hi' ? 'लंबित' : 'Awaiting Correction'}
                    </span>
                  </div>

                  <div className='mb-2 rounded bg-amber-50/70 border border-amber-200/60 p-2 text-amber-950'>
                    <p className='font-semibold text-[11px] text-amber-800'>
                      {lang === 'hi' ? 'समीक्षक की टिप्पणी:' : 'Reviewer Query:'}
                    </p>
                    <p className='mt-0.5 leading-relaxed'>{fq.remarks}</p>
                    <p className='mt-1 text-[10px] text-amber-700/80'>
                      {new Date(fq.createdAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  {fq.status === 'responded' && (
                    <div className='rounded bg-emerald-50/60 border border-emerald-200/60 p-2.5 text-emerald-950'>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]'>
                        <div>
                          <span className='font-semibold text-slate-500 block'>
                            {lang === 'hi' ? 'पूर्व मान:' : 'Previous Value:'}
                          </span>
                          <span className='font-mono text-slate-700'>{fq.previousValue || '—'}</span>
                        </div>
                        <div>
                          <span className='font-semibold text-emerald-800 block'>
                            {lang === 'hi' ? 'सुधारा गया मान:' : 'Updated Value:'}
                          </span>
                          <span className='font-mono font-bold text-emerald-900'>{fq.newValue || '—'}</span>
                        </div>
                      </div>
                      {fq.applicantNotes && (
                        <div className='mt-2 pt-2 border-t border-emerald-200/60'>
                          <span className='font-semibold text-emerald-800 text-[11px]'>
                            {lang === 'hi' ? 'आवेदक की टिप्पणी:' : 'Your Note:'}{' '}
                          </span>
                          <span className='text-emerald-900 text-xs italic'>{fq.applicantNotes}</span>
                        </div>
                      )}
                      {fq.respondedAt && (
                        <p className='mt-1 text-[10px] text-emerald-700/80'>
                          {lang === 'hi' ? 'सुधार तिथि:' : 'Responded on:'}{' '}
                          {new Date(fq.respondedAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Document & Application Query Trail */}
          {(validQueryHistory.length > 0 || reuploadedDocs.length > 0) && (
            <div className='flex flex-col gap-2.5 pt-3'>
              <p className='text-xs font-bold uppercase tracking-wider text-slate-500'>
                {lang === 'hi' ? 'दस्तावेज़ स्पष्टीकरण एवं पुनः अपलोड' : 'Document & Application Queries'}
              </p>

              {/* Documents with applicant reupload notes */}
              {reuploadedDocs.map(doc => (
                <div key={`trail-doc-note-${doc.documentKey}`} className='rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs'>
                  <div className='flex items-center justify-between gap-2 flex-wrap mb-1.5'>
                    <span className='font-bold text-slate-900 text-sm'>
                      {lang === 'hi' && doc.labelHi ? doc.labelHi : doc.label}
                    </span>
                    <span className='rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold border border-emerald-200'>
                      {lang === 'hi' ? 'पुनः अपलोड किया गया' : 'Re-uploaded'}
                    </span>
                  </div>
                  <div className='rounded bg-emerald-50/60 border border-emerald-200/60 p-2 text-emerald-950'>
                    <p className='font-semibold text-emerald-800 text-[11px]'>
                      {lang === 'hi' ? 'आवेदक का स्पष्टीकरण / नोट:' : 'Your Re-upload Note:'}
                    </p>
                    <p className='mt-0.5 leading-relaxed italic text-emerald-900'>{doc.reuploadNotes}</p>
                    {doc.reuploadedAt && (
                      <p className='mt-1 text-[10px] text-emerald-700/80'>
                        {new Date(doc.reuploadedAt).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Past reviewer query remarks from queryHistory */}
              {validQueryHistory.length > 0 && (
                <div className='flex flex-col gap-2'>
                  {validQueryHistory.map((entry, idx) => (
                    <div key={`trail-qh-${idx}`} className='rounded-lg border border-slate-200 bg-slate-50/40 p-2.5 text-xs text-slate-800'>
                      <div className='flex items-center justify-between gap-2'>
                        {entry.documentLabel ? (
                          <span className='font-bold text-slate-900'>{entry.documentLabel}</span>
                        ) : (
                          <span className='font-bold text-slate-900'>
                            {lang === 'hi' ? 'संपूर्ण आवेदन' : 'Application'}
                          </span>
                        )}
                        <span className='text-[10px] text-slate-500'>
                          {new Date(entry.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className='mt-1 text-slate-700 leading-relaxed'>{entry.remarks}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QueryTrailCard
