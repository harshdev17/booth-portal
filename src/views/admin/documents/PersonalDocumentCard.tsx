'use client'

import { EyeIcon } from 'lucide-react'

import { getDocumentStatusConfig } from '@/lib/applications/status-config'
import DocumentDecisionActions from '@/views/admin/documents/DocumentDecisionActions'

export type PersonalDocumentRow = {
  id: number
  label: string
  original_filename: string
  verification_status: string
  verification_remarks: string | null
  reuploaded_at: string | null
}

/**
 * Shows the Aadhaar Card (and other identity-proof documents) directly on
 * the Personal tab, right next to the Identity fields they correspond to,
 * instead of requiring a separate click into the Documents tab — per
 * explicit request. Its Preview action opens the same secure document
 * endpoint in a new browser tab, consistent with the Documents tab.
 */
const PersonalDocumentCard = ({
  document,
  canVerifyDocuments
}: {
  document: PersonalDocumentRow
  canVerifyDocuments: boolean
}) => {
  const docCfg = getDocumentStatusConfig(document.verification_status)

  return (
    <div className='sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <p className='text-sm font-semibold text-[#0c2847]'>{document.label}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${docCfg.color}`}>
              {docCfg.label}
            </span>
            {document.reuploaded_at && (
              <span className='shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800'>
                Re-uploaded {new Date(document.reuploaded_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className='text-xs text-muted-foreground'>{document.original_filename}</p>
          {document.verification_remarks && (
            <p className='mt-1 text-xs text-amber-700'>Remark: {document.verification_remarks}</p>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <a
            href={`/api/documents/${document.id}/preview`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
          >
            <EyeIcon className='size-3.5' /> Preview
          </a>
          {canVerifyDocuments && (
            <DocumentDecisionActions documentId={document.id} currentStatus={document.verification_status} />
          )}
        </div>
      </div>
    </div>
  )
}

export default PersonalDocumentCard
