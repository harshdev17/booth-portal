'use client'

import { useActionState, useRef, useState } from 'react'

import { CheckCheckIcon, DownloadIcon, EyeIcon, Loader2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'
import { verifyAllDocumentsAction, type DocumentActionState } from '@/app/server/document-actions'
import DocumentDecisionActions, { RaiseApplicationQueryButton } from '@/views/admin/documents/DocumentDecisionActions'

const verifyAllInitialState: DocumentActionState = {}

/**
 * Verifies every uploaded, not-yet-verified document on this application in
 * one click — per explicit request, so an admin who already reviewed every
 * document (e.g. outside the portal, or confirmed by phone) doesn't have to
 * click "Verify" once per document one by one. Only shown when there's at
 * least one eligible document (uploaded, not already verified, no open
 * query) — see verifyAllDocumentsAction's own doc comment for exactly what
 * it does and doesn't touch.
 */
const VerifyAllDocumentsButton = ({ applicationId }: { applicationId: number }) => {
  const [state, formAction, isPending] = useActionState(verifyAllDocumentsAction, verifyAllInitialState)

  return (
    <form action={formAction} className='flex flex-col items-end gap-1.5'>
      <input type='hidden' name='applicationId' value={applicationId} />
      <Button type='submit' size='sm' variant='outline' disabled={isPending} className='border-emerald-300 text-emerald-700 hover:bg-emerald-50'>
        {isPending ? <Loader2Icon className='animate-spin' /> : <CheckCheckIcon className='size-3.5' />}
        Approve All Documents
      </Button>
      {state.error && (
        <Alert variant='destructive' className='w-fit py-1.5'>
          <AlertDescription className='text-xs'>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && <p className='text-[11px] font-medium text-emerald-700'>{state.success}</p>}
    </form>
  )
}

/**
 * Lets an authorized admin (application:edit) upload/replace a document on
 * the applicant's behalf — e.g. the applicant can't manage it themselves
 * and calls/emails the office directly — per explicit request (2026-11-03).
 * Posts to the admin-only POST /api/admin/applications/[id]/documents route
 * (separate from the applicant-facing one, which authorizes via access
 * token/OTP, not an admin session).
 */
const AdminUploadButton = ({
  applicationId,
  documentKey,
  isReplace,
  onUploaded
}: {
  applicationId: string
  documentKey: string
  isReplace: boolean
  onUploaded: () => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return

    setError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()

      formData.append('documentKey', documentKey)
      formData.append('file', file)

      const response = await fetch(`/api/admin/applications/${applicationId}/documents`, {
        method: 'POST',
        body: formData
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? 'Upload failed.')

        return
      }

      onUploaded()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className='flex flex-col items-end gap-1'>
      <label className='inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'>
        {isUploading ? <Loader2Icon className='size-3.5 animate-spin' /> : <UploadIcon className='size-3.5' />}
        {isReplace ? 'Replace' : 'Upload'}
        <input
          ref={inputRef}
          type='file'
          accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'
          className='sr-only'
          disabled={isUploading}
          onChange={e => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      {error && <p className='text-[11px] font-semibold text-red-600'>{error}</p>}
    </div>
  )
}

export type ApplicationDocumentRow = {
  id: number | null
  document_key: string
  label: string
  original_filename: string | null
  verification_status: string | null
  verification_remarks: string | null
  reuploaded_at: string | null
}


// Identity-proof document types go under the "Personal" sub-tab (mirrors the
// page-level Personal/Application tab split the admin asked to bring back);
// everything else — registration certificates, licenses, authorization
// letters, product/work photos — is a business/category-specific document
// and goes under "Application". Keyed on document_key, not label, since
// label text varies per category (e.g. "Aadhaar Card / ID Proof" vs
// "Owner/Authorized Representative Aadhaar Card" are both aadhaar_card).
const PERSONAL_DOCUMENT_KEYS = new Set(['aadhaar_card', 'passport_photo', 'representative_id'])

export type ApplicationQueryHistoryEntry = { id: number; remarks: string; createdAt: string }

const ApplicationDocumentsSection = ({
  documents,
  canVerifyDocuments,
  canEditApplication,
  applicationId,
  numericApplicationId,
  canRaiseApplicationQuery,
  applicationQueryHistory
}: {
  documents: ApplicationDocumentRow[]
  canVerifyDocuments: boolean
  canEditApplication: boolean
  /** Opaque-encoded id, for the admin upload route (decodeId()-based auth). */
  applicationId: string
  /** Raw numeric id, for RaiseApplicationQueryButton's server action (z.coerce.number(), not opaque-id based). */
  numericApplicationId: number
  canRaiseApplicationQuery: boolean
  applicationQueryHistory: ApplicationQueryHistoryEntry[]
}) => {
  const reloadAfterUpload = () => window.location.reload()

  const personalDocs = documents.filter(d => PERSONAL_DOCUMENT_KEYS.has(d.document_key))
  const applicationDocs = documents.filter(d => !PERSONAL_DOCUMENT_KEYS.has(d.document_key))

  // documents now has one row per required document DEFINITION (uploaded
  // or not — see the page's LEFT JOIN), so its length is no longer "how
  // many were uploaded." Tracked separately for the card title/empty state.
  const uploadedCount = documents.filter(d => d.id !== null).length

  // Eligible for "Approve All Documents" — uploaded, not already verified,
  // and not currently under an open query (same rule verifyAllDocumentsAction
  // enforces server-side; mirrored here only to decide whether to show the
  // button at all, not as the real gate).
  const pendingVerificationCount = documents.filter(
    d => d.id !== null && d.verification_status !== 'verified' && d.verification_status !== 'query'
  ).length

  const renderDocList = (docs: ApplicationDocumentRow[]) =>
    docs.length === 0 ? (
      <p className='py-8 text-center text-sm text-muted-foreground'>No documents in this section.</p>
    ) : (
      <div className='divide-y'>
        {docs.map(doc => {
          // A required document the applicant never uploaded at all (not
          // just one pending review) — the category's document definitions
          // are LEFT JOINed against application_documents, so this shows up
          // as a row with no id instead of not appearing on this page at
          // all. Reported live: an admin had no way to see that
          // "Work/Product Photographs" was still outstanding for an
          // application in query_raised.
          if (doc.id === null) {
            return (
              <div key={doc.document_key} className='flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-semibold text-slate-500'>{doc.label}</p>
                    <span className='shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200'>
                      Not uploaded
                    </span>
                  </div>
                </div>
                {canEditApplication && (
                  <AdminUploadButton
                    applicationId={applicationId}
                    documentKey={doc.document_key}
                    isReplace={false}
                    onUploaded={reloadAfterUpload}
                  />
                )}
              </div>
            )
          }

          const docCfg = getDocumentStatusConfig(doc.verification_status!)

          return (
            <div key={doc.id} className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <div className='flex items-center gap-2'>
                  <p className='text-sm font-semibold text-[#0c2847]'>{doc.label}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${docCfg.color}`}>
                    {docCfg.label}
                  </span>
                  {doc.reuploaded_at && (
                    <span className='shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800'>
                      Re-uploaded {new Date(doc.reuploaded_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className='text-xs text-muted-foreground'>{doc.original_filename}</p>
                {doc.verification_remarks && (
                  <p className='mt-1 text-xs text-amber-700'>Remark: {doc.verification_remarks}</p>
                )}
              </div>

              <div className='flex shrink-0 items-center gap-2'>
                <a
                  href={`/api/documents/${doc.id}/preview`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
                >
                  <EyeIcon className='size-3.5' /> Preview
                </a>
                <a
                  href={`/api/documents/${doc.id}/preview?download=true`}
                  className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
                >
                  <DownloadIcon className='size-3.5' /> Download
                </a>
                {canVerifyDocuments && (
                  <DocumentDecisionActions documentId={doc.id} currentStatus={doc.verification_status!} />
                )}
                {canEditApplication && (
                  <AdminUploadButton
                    applicationId={applicationId}
                    documentKey={doc.document_key}
                    isReplace
                    onUploaded={reloadAfterUpload}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )

  return (
    <div className='flex flex-col gap-4'>
      {(applicationQueryHistory.length > 0 || (uploadedCount === 0 && canRaiseApplicationQuery)) && (
        <Card className='shadow-xs border-amber-200 bg-amber-50/40'>
          <CardHeader>
            <CardTitle className='text-base'>Application-Level Queries</CardTitle>
          </CardHeader>
          <CardContent>
            {applicationQueryHistory.length > 0 && (
              <div className='mb-4 space-y-2'>
                {applicationQueryHistory.map(entry => (
                  <div key={entry.id} className='rounded-md border border-amber-200 bg-white px-3 py-2 text-sm'>
                    <p className='text-[#0c2847]'>{entry.remarks}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      Raised {new Date(entry.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {canRaiseApplicationQuery && (
              <RaiseApplicationQueryButton applicationId={numericApplicationId} />
            )}
          </CardContent>
        </Card>
      )}

      <Card className='shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between gap-3'>
          <CardTitle className='text-base'>
            Documents ({uploadedCount}/{documents.length} uploaded)
          </CardTitle>
          {canVerifyDocuments && pendingVerificationCount > 0 && (
            <VerifyAllDocumentsButton applicationId={numericApplicationId} />
          )}
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>No documents required for this category.</p>
          ) : (
            <Tabs defaultValue='personal'>
              <TabsList>
                <TabsTrigger value='personal'>Personal ({personalDocs.length})</TabsTrigger>
                <TabsTrigger value='application'>Application ({applicationDocs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value='personal'>{renderDocList(personalDocs)}</TabsContent>
              <TabsContent value='application'>{renderDocList(applicationDocs)}</TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicationDocumentsSection
