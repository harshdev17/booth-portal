'use client'

import { useState } from 'react'

import { ChevronDownIcon, ChevronUpIcon, DownloadIcon, EyeIcon, HistoryIcon } from 'lucide-react'

import { getDocumentStatusConfig } from '@/lib/applications/status-config'

export type DocumentVersionRow = {
  id: number
  original_filename: string
  verification_status: string
  verification_remarks: string | null
  superseded_at: string
}

/**
 * Expandable "Previous versions" disclosure shown under a document row —
 * each entry is a version of this document that a later re-upload
 * replaced (see migration 0077). Only re-uploads made after this feature
 * shipped have any entries; nothing renders for a document that was only
 * ever uploaded once. Serves old files via /api/documents/versions/[id],
 * admin-only (never the applicant-facing preview route), distinct from
 * the current version's own preview/download links.
 */
const DocumentVersionHistory = ({ versions }: { versions: DocumentVersionRow[] }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (versions.length === 0) return null

  return (
    <div className='mt-2'>
      <button
        type='button'
        onClick={() => setIsOpen(prev => !prev)}
        className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0c2847] transition'
      >
        <HistoryIcon className='size-3.5' />
        Previous versions ({versions.length})
        {isOpen ? <ChevronUpIcon className='size-3.5' /> : <ChevronDownIcon className='size-3.5' />}
      </button>

      {isOpen && (
        <ul className='mt-2 flex max-w-xl flex-col divide-y divide-slate-100 rounded-md border border-border/60 bg-slate-50/60'>
          {versions.map(version => {
            const cfg = getDocumentStatusConfig(version.verification_status)
            const previewSrc = `/api/documents/versions/${version.id}`

            return (
              <li key={version.id} className='flex flex-col gap-1 px-2.5 py-2 text-xs'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className='truncate font-medium text-slate-700'>{version.original_filename}</span>
                  <span className='shrink-0 text-[11px] text-muted-foreground'>
                    {new Date(version.superseded_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit'
                    })}
                  </span>
                  <a
                    href={previewSrc}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#0c2847] hover:underline'
                  >
                    <EyeIcon className='size-3' /> View
                  </a>
                  <a
                    href={`${previewSrc}?download=true`}
                    className='inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#0c2847] hover:underline'
                  >
                    <DownloadIcon className='size-3' /> Download
                  </a>
                </div>
                {version.verification_remarks && (
                  <p className='text-[11px] text-amber-700'>Remark at the time: {version.verification_remarks}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default DocumentVersionHistory
