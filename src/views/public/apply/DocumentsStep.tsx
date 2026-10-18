'use client'

import { useEffect, useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, EyeIcon, FileTextIcon, Loader2Icon, UploadIcon, XIcon } from 'lucide-react'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLanguage } from '@/context/LanguageContext'
import type { CategoryDocumentDto } from '@/views/public/apply/types'

/**
 * /api/documents/[id]/preview only reads the access token from an
 * Authorization header, never a query string (consistent with every other
 * application endpoint — see access-session.ts's reasoning on why the token
 * never goes in a URL). A plain <a href>/iframe src can't set that header,
 * so preview fetches the file as a blob client-side and renders it from an
 * object URL inside an in-page dialog (previously opened a new browser tab
 * — reported live as disruptive; the admin side already does the same
 * in-page-preview pattern, see ApplicationDocumentsSection.tsx).
 */
type PreviewState = { documentId: number; label: string; url: string; mimeType: string } | null

export function usePreviewController() {
  const [preview, setPreview] = useState<PreviewState>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const open = async (documentId: number, label: string, accessToken: string) => {
    setPreviewError(null)
    setIsLoadingPreview(true)

    try {
      const response = await fetch(`/api/documents/${documentId}/preview`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!response.ok) {
        setPreviewError('Could not load this document. Please try again.')

        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setPreview({ documentId, label, url, mimeType: blob.type })
    } catch {
      setPreviewError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const close = () => {
    setPreview(null)
    setPreviewError(null)
  }

  // Revoke the object URL once the dialog is actually closed, not on a
  // fixed timer — avoids freeing it while the applicant is still viewing.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  return { preview, previewError, isLoadingPreview, open, close }
}

/**
 * Shared in-page preview dialog — rendered once per page alongside whichever
 * component calls usePreviewController(). Images render directly; PDFs use
 * an <iframe> since <img> can't display them (the object URL's blob already
 * carries the correct MIME type, so no extra fetch/type-detection needed).
 */
export function DocumentPreviewDialog({
  preview,
  previewError,
  isLoadingPreview,
  previewLabel,
  onClose
}: {
  preview: PreviewState
  previewError?: string | null
  isLoadingPreview?: boolean
  previewLabel?: string
  onClose: () => void
}) {
  const { lang } = useLanguage()
  const isOpen = !!preview || !!previewError || !!isLoadingPreview

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent showCloseButton={false} className='flex h-[85vh] max-w-3xl flex-col gap-0 p-0'>
        <DialogHeader className='flex-row items-center justify-between space-y-0 border-b border-[#e2e8f0] px-5 py-3'>
          <DialogTitle className='truncate text-sm font-bold text-[#0c2847]'>{preview?.label ?? previewLabel}</DialogTitle>
          <button
            type='button'
            onClick={onClose}
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close'}
            className='rounded-full p-1.5 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0c2847]'
          >
            <XIcon className='size-4' />
          </button>
        </DialogHeader>

        <div className='flex min-h-0 flex-1 items-center justify-center bg-[#f8fafc] p-3'>
          {isLoadingPreview && !preview && !previewError && (
            <Loader2Icon className='size-6 animate-spin text-[#94a3b8]' />
          )}

          {previewError && (
            <p className='max-w-sm text-center text-sm font-semibold text-red-600'>{previewError}</p>
          )}

          {preview?.mimeType.startsWith('image/') ? (
             
            <img src={preview.url} alt={preview.label} className='mx-auto h-full w-auto object-contain' />
          ) : (
            preview && <iframe src={preview.url} title={preview.label} className='size-full rounded-lg border border-[#e2e8f0] bg-white' />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type DocumentUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

export type DocumentUploadState = Record<
  string,
  { status: DocumentUploadStatus; error?: string; fileName?: string; documentId?: number }
>

const DocumentsStep = ({
  documents,
  uploadState,
  onUpload,
  accessToken,
  highlightMissing
}: {
  documents: CategoryDocumentDto[]
  uploadState: DocumentUploadState
  onUpload: (documentKey: string, file: File) => Promise<void>
  accessToken: string | null
  highlightMissing?: boolean
}) => {
  const { lang } = useLanguage()
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const { preview, previewError, isLoadingPreview, open: openPreview, close: closePreview } = usePreviewController()

  if (documents.length === 0) {
    return (
      <p className='text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'इस श्रेणी के लिए कोई दस्तावेज़ आवश्यक नहीं है।'
          : 'No documents are required for this category.'}
      </p>
    )
  }

  const missingRequiredDocs = documents.filter(
    doc => doc.required && uploadState[doc.key]?.status !== 'uploaded'
  )

  const handleFileSelect = (doc: CategoryDocumentDto, file: File | undefined) => {
    if (!file) return

    const maxMb = Math.round(doc.maxSizeBytes / (1024 * 1024))

    if (file.size > doc.maxSizeBytes) {
      const friendlyError =
        lang === 'hi'
          ? `फ़ाइल का आकार सीमा (${maxMb} MB) से अधिक है। कृपया ${maxMb} MB से छोटी फ़ाइल अपलोड करें।`
          : `File size exceeds the allowed limit of ${maxMb} MB. Please upload a file smaller than ${maxMb} MB.`

      void onUpload(doc.key, Object.assign(file, { __clientError: friendlyError }) as unknown as File)

      return
    }

    void onUpload(doc.key, file)
  }

  return (
    <div>
      {highlightMissing && missingRequiredDocs.length > 0 && (
        <div className='mb-4 flex items-center gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-semibold text-red-800 shadow-xs animate-in fade-in'>
          <AlertCircleIcon className='size-5 shrink-0 text-red-600' />
          <span>
            {lang === 'hi'
              ? `कृपया आगे बढ़ने से पहले शेष ${missingRequiredDocs.length} अनिवार्य दस्तावेज (*) अपलोड करें।`
              : `Please upload the remaining ${missingRequiredDocs.length} required document(s) before continuing.`}
          </span>
        </div>
      )}

      <div className={`rounded-lg border transition-all duration-300 ${highlightMissing && missingRequiredDocs.length > 0 ? 'border-red-400 ring-2 ring-red-400/20' : 'border-[#e2e8f0]'}`}>
        {/* Header row */}
        <div className='hidden grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-xs font-bold tracking-wide text-[#64748b] uppercase sm:grid'>
          <span>{lang === 'hi' ? 'दस्तावेज़' : 'Document'}</span>
          <span>{lang === 'hi' ? 'स्थिति' : 'Status'}</span>
          <span className='text-right'>{lang === 'hi' ? 'कार्रवाई' : 'Action'}</span>
        </div>

        {documents.map((doc, index) => {
          const itemState = uploadState[doc.key]
          const state = itemState?.status ?? 'idle'
          const error = itemState?.error
          const fileName = itemState?.fileName
          const documentId = itemState?.documentId
          const isDragOver = dragOverKey === doc.key
          const maxMb = Math.round(doc.maxSizeBytes / (1024 * 1024))
          const displayName = lang === 'hi' && doc.labelHi ? doc.labelHi : doc.label
          const isMissingRequired = Boolean(highlightMissing && doc.required && state !== 'uploaded')

          return (
            <div
              key={doc.key}
              className={`grid grid-cols-1 items-center gap-3 px-4 py-3.5 transition-colors sm:grid-cols-[1fr_auto_auto] sm:gap-4 ${
                index > 0 ? 'border-t border-[#e2e8f0]' : ''
              } ${isDragOver ? 'bg-[#fffaf0]' : ''} ${
                isMissingRequired ? 'bg-red-50/60 border-l-4 border-l-red-500' : ''
              }`}
              onDragOver={e => {
                e.preventDefault()
                setDragOverKey(doc.key)
              }}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={e => {
                e.preventDefault()
                setDragOverKey(null)
                const file = e.dataTransfer.files[0]

                handleFileSelect(doc, file)
              }}
            >
              <div className='min-w-0'>
                <p className='flex items-center gap-1.5 text-sm font-semibold text-[#0c2847]'>
                  <FileTextIcon className={`size-3.5 shrink-0 ${isMissingRequired ? 'text-red-500' : 'text-[#94a3b8]'}`} />
                  <span className='truncate'>{displayName}</span>
                  {doc.required && <span className='text-red-600 font-bold'>*</span>}
                </p>
                <p className='mt-0.5 ml-5 text-xs text-[#94a3b8]'>
                  {lang === 'hi'
                    ? `PDF, JPG या PNG · अधिकतम ${maxMb} MB`
                    : `PDF, JPG or PNG · Max ${maxMb} MB`}
                </p>

                {state === 'uploaded' && fileName && (
                  <p className='mt-1 ml-5 truncate text-xs text-[#64748b]'>{fileName}</p>
                )}

                {error && (
                  <p className='mt-1 ml-5 text-xs font-semibold text-red-600'>{error}</p>
                )}

                {isMissingRequired && !error && (
                  <p className='mt-1.5 ml-5 flex items-center gap-1.5 text-xs font-bold text-red-600 animate-in fade-in'>
                    <AlertCircleIcon className='size-3.5 shrink-0 text-red-600' />
                    <span>{lang === 'hi' ? 'यह दस्तावेज़ अपलोड करना अनिवार्य है।' : 'This document is required to upload.'}</span>
                  </p>
                )}
              </div>

              <div className='flex items-center gap-1.5 text-xs font-semibold sm:justify-self-start'>
                {state === 'uploading' && (
                  <>
                    <Loader2Icon className='size-3.5 shrink-0 animate-spin text-[#94a3b8]' />
                    <span className='text-[#64748b]'>{lang === 'hi' ? 'अपलोड हो रहा है' : 'Uploading'}</span>
                  </>
                )}
                {state === 'uploaded' && (
                  <>
                    <CheckCircle2Icon className='size-3.5 shrink-0 text-emerald-600' />
                    <span className='text-emerald-700 font-bold'>{lang === 'hi' ? 'अपलोड हो गया' : 'Uploaded'}</span>
                  </>
                )}
                {state === 'error' && (
                  <>
                    <span className='size-1.5 shrink-0 rounded-full bg-red-600' />
                    <span className='text-red-600 font-bold'>{lang === 'hi' ? 'विफल' : 'Failed'}</span>
                  </>
                )}
                {state === 'idle' && (
                  isMissingRequired ? (
                    <span className='rounded-md border border-red-300 bg-red-100/90 px-2 py-0.5 text-xs font-bold text-red-700 animate-pulse'>
                      {lang === 'hi' ? 'अपलोड अनिवार्य' : 'Upload Required'}
                    </span>
                  ) : (
                    <span className='text-[#94a3b8]'>{lang === 'hi' ? 'लंबित' : 'Pending'}</span>
                  )
                )}
              </div>

              <div className='flex items-center gap-2 sm:justify-self-end'>
                {state === 'uploaded' && documentId && accessToken && (
                  <button
                    type='button'
                    onClick={() => void openPreview(documentId, displayName, accessToken)}
                    className='flex shrink-0 items-center gap-1 text-xs font-bold text-[#0c2847] hover:underline'
                  >
                    <EyeIcon className='size-3.5' />
                    {lang === 'hi' ? 'देखें' : 'View'}
                  </button>
                )}

                <label className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  isMissingRequired
                    ? 'border border-red-500 bg-red-600 text-white shadow-xs hover:bg-red-700'
                    : 'border border-[#e2e8f0] text-[#0c2847] hover:border-[#0c2847]'
                }`}>
                  <UploadIcon className='size-3.5' />
                  <span>
                    {state === 'uploaded'
                      ? lang === 'hi'
                        ? 'बदलें'
                        : 'Replace'
                      : lang === 'hi'
                        ? 'अपलोड'
                        : 'Upload'}
                  </span>
                  <input
                    type='file'
                    accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
                    className='sr-only'
                    onChange={e => {
                      const file = e.target.files?.[0]

                      handleFileSelect(doc, file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>
          )
        })}
      </div>

      <DocumentPreviewDialog
        preview={preview}
        previewError={previewError}
        isLoadingPreview={isLoadingPreview}
        onClose={closePreview}
      />
    </div>
  )
}

export default DocumentsStep

