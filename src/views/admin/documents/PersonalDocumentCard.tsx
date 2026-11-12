'use client'

import { useState } from 'react'

import { DownloadIcon, EyeIcon, Loader2Icon } from 'lucide-react'

import { previewKindFor } from '@/lib/applications/document-preview-kind'
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
 * explicit request. Preview expands the document inline (PDF/image) right
 * in this card instead of opening a new browser tab — per explicit request:
 * with 1000+ applications to verify, switching tabs for every document made
 * bulk verification impractically slow.
 */
const PersonalDocumentCard = ({
  document,
  canVerifyDocuments
}: {
  document: PersonalDocumentRow
  canVerifyDocuments: boolean
}) => {
  const docCfg = getDocumentStatusConfig(document.verification_status)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const previewKind = previewKindFor(document.original_filename)
  const previewSrc = `/api/documents/${document.id}/preview`

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
          <button
            type='button'
            onClick={() => {
              setIsPreviewOpen(prev => !prev)
              if (!isPreviewOpen) setIsPreviewLoading(true)
            }}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
              isPreviewOpen
                ? 'border-[#0c2847] bg-[#0c2847] text-white hover:bg-[#06192e]'
                : 'border-input bg-white text-[#0c2847] hover:bg-muted'
            }`}
          >
            <EyeIcon className='size-3.5' /> {isPreviewOpen ? 'Hide Preview' : 'Preview'}
          </button>
          <a
            href={`${previewSrc}?download=true`}
            className='inline-flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
          >
            <DownloadIcon className='size-3.5' /> Download
          </a>
          {canVerifyDocuments && (
            <DocumentDecisionActions documentId={document.id} currentStatus={document.verification_status} />
          )}
        </div>
      </div>

      {isPreviewOpen && (
        <div className='mt-3 border-t pt-3'>
          {previewKind === 'pdf' && (
            <div className='relative min-h-[70vh]'>
              {isPreviewLoading && (
                <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md border bg-white'>
                  <Loader2Icon className='size-6 animate-spin text-[#0c2847]' />
                  <p className='text-sm font-medium text-muted-foreground'>Loading preview…</p>
                </div>
              )}
              <iframe
                src={previewSrc}
                title={document.label}
                onLoad={() => setIsPreviewLoading(false)}
                className='h-[70vh] w-full rounded-md border'
              />
            </div>
          )}
          {previewKind === 'image' && (
            <div className='relative min-h-[70vh] rounded-md border bg-white'>
              {isPreviewLoading && (
                <div className='absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-white'>
                  <Loader2Icon className='size-6 animate-spin text-[#0c2847]' />
                  <p className='text-sm font-medium text-muted-foreground'>Loading preview…</p>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-only authenticated document bytes, not a next/image-optimizable public asset */}
              <img
                src={previewSrc}
                alt={document.label}
                onLoad={() => setIsPreviewLoading(false)}
                className='mx-auto block max-h-[70vh] w-auto max-w-full object-contain p-2'
              />
            </div>
          )}
          {previewKind === null && (
            <p className='rounded-md border bg-white py-6 text-center text-sm text-muted-foreground'>
              Preview not available for this file type.{' '}
              <a href={`${previewSrc}?download=true`} className='font-semibold text-[#0c2847] underline'>
                Download instead
              </a>
              .
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default PersonalDocumentCard
