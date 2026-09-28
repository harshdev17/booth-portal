'use client'

import { useState } from 'react'

import { CheckCircle2Icon, FileTextIcon, Loader2Icon, UploadIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'
import type { CategoryDocumentDto } from '@/views/public/apply/types'

export type DocumentUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error'

export type DocumentUploadState = Record<
  string,
  { status: DocumentUploadStatus; error?: string; fileName?: string }
>

const DocumentsStep = ({
  documents,
  uploadState,
  onUpload
}: {
  documents: CategoryDocumentDto[]
  uploadState: DocumentUploadState
  onUpload: (documentKey: string, file: File) => Promise<void>
}) => {
  const { lang } = useLanguage()
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  if (documents.length === 0) {
    return (
      <p className='text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'इस श्रेणी के लिए कोई दस्तावेज़ आवश्यक नहीं है।'
          : 'No documents are required for this category.'}
      </p>
    )
  }

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
    <div className='flex flex-col gap-4'>
      {documents.map(doc => {
        const itemState = uploadState[doc.key]
        const state = itemState?.status ?? 'idle'
        const error = itemState?.error
        const fileName = itemState?.fileName
        const isDragOver = dragOverKey === doc.key
        const maxMb = Math.round(doc.maxSizeBytes / (1024 * 1024))
        const displayName = lang === 'hi' && doc.labelHi ? doc.labelHi : doc.label

        return (
          <div
            key={doc.key}
            className={`rounded-2xl border-2 border-dashed p-6 transition ${
              isDragOver
                ? 'border-[#d8891d] bg-[#fffaf0]'
                : state === 'uploaded'
                  ? 'border-emerald-300 bg-[#f0fdf4]/50 hover:border-emerald-400'
                  : 'border-[#cbd5e1] bg-[#fafbfc] hover:border-[#d8891d]/60'
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
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
              <div className='min-w-0 flex-1'>
                <p className='font-bold text-[#0c2847] text-base'>
                  {displayName}
                  {doc.required && <span className='text-red-600'> *</span>}
                </p>
                <p className='text-xs text-[#64748b] mt-0.5'>
                  {lang === 'hi'
                    ? `स्वीकृत प्रारूप: PDF, JPG या PNG · अधिकतम आकार ${maxMb} MB`
                    : `PDF, JPG or PNG · Max ${maxMb} MB`}
                </p>

                {/* Uploaded File Name Pill */}
                {state === 'uploaded' && fileName && (
                  <div className='mt-2.5 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 max-w-full'>
                    <FileTextIcon className='size-3.5 shrink-0 text-emerald-600' />
                    <span className='truncate'>{fileName}</span>
                    <span className='rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 shrink-0'>
                      {lang === 'hi' ? 'अपलोड हो गया' : 'Uploaded'}
                    </span>
                  </div>
                )}

                {error && (
                  <p className='mt-2 text-xs font-bold text-red-600 flex items-center gap-1.5'>
                    <span className='inline-block size-1.5 rounded-full bg-red-600 shrink-0' />
                    <span>{error}</span>
                  </p>
                )}
              </div>

              <label className='inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#0c2847] bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#0c2847] shadow-xs transition hover:bg-[#0c2847] hover:text-white shrink-0'>
                {state === 'uploading' ? (
                  <Loader2Icon className='size-4 animate-spin text-[#d8891d]' />
                ) : state === 'uploaded' ? (
                  <CheckCircle2Icon className='size-4 text-emerald-600' />
                ) : (
                  <UploadIcon className='size-4' />
                )}
                <span>
                  {state === 'uploaded'
                    ? lang === 'hi'
                      ? 'फ़ाइल बदलें (Replace)'
                      : 'Replace File'
                    : lang === 'hi'
                      ? 'फ़ाइल चुनें (Choose File)'
                      : 'Choose File'}
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
  )
}

export default DocumentsStep

