'use client'

import { useState } from 'react'

import { EyeIcon, FileIcon } from 'lucide-react'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'
import DocumentDecisionActions from '@/views/admin/documents/DocumentDecisionActions'

export type PersonalDocumentRow = {
  id: number
  label: string
  original_filename: string
  verification_status: string
  verification_remarks: string | null
}

/**
 * Shows the Aadhaar Card (and other identity-proof documents) directly on
 * the Personal tab, right next to the Identity fields they correspond to,
 * instead of requiring a separate click into the Documents tab — per
 * explicit request. Same preview-sheet mechanism as
 * ApplicationDocumentsSection.tsx (an in-page slide-over, not a new browser
 * tab), kept as its own small component rather than duplicated inline since
 * both places need the identical sheet + verify/reject/query UI.
 */
const PersonalDocumentCard = ({
  document,
  canVerifyDocuments
}: {
  document: PersonalDocumentRow
  canVerifyDocuments: boolean
}) => {
  const [previewOpen, setPreviewOpen] = useState(false)
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
          </div>
          <p className='text-xs text-muted-foreground'>{document.original_filename}</p>
          {document.verification_remarks && (
            <p className='mt-1 text-xs text-amber-700'>Remark: {document.verification_remarks}</p>
          )}
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <button
            type='button'
            onClick={() => setPreviewOpen(true)}
            className='inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
          >
            <EyeIcon className='size-3.5' /> Preview
          </button>
          {canVerifyDocuments && (
            <DocumentDecisionActions documentId={document.id} currentStatus={document.verification_status} />
          )}
        </div>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side='right' className='w-full sm:w-1/2 sm:max-w-none'>
          <SheetHeader className='border-b'>
            <SheetTitle className='flex items-center gap-2 text-[#0c2847]'>
              <FileIcon className='size-4' />
              {document.label}
            </SheetTitle>
          </SheetHeader>

          <div className='min-h-0 flex-1 px-4 pb-4'>
            <iframe
              src={`/api/documents/${document.id}/preview`}
              title={document.label}
              className='size-full rounded-md border border-border/60'
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default PersonalDocumentCard
