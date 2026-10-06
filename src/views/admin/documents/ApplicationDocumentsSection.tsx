'use client'

import { useState } from 'react'

import { EyeIcon, FileIcon } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'
import DocumentDecisionActions from '@/views/admin/documents/DocumentDecisionActions'

export type ApplicationDocumentRow = {
  id: number
  document_key: string
  label: string
  original_filename: string
  verification_status: string
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

/**
 * Previously opened each document's preview in a new browser tab. Moved to
 * an in-page slide-over so an admin can check a document against the
 * verify/reject/query buttons right next to it without losing their place
 * on the application page (reported live: tabs kept scattering).
 */
const ApplicationDocumentsSection = ({
  documents,
  canVerifyDocuments
}: {
  documents: ApplicationDocumentRow[]
  canVerifyDocuments: boolean
}) => {
  const [previewDoc, setPreviewDoc] = useState<ApplicationDocumentRow | null>(null)

  const personalDocs = documents.filter(d => PERSONAL_DOCUMENT_KEYS.has(d.document_key))
  const applicationDocs = documents.filter(d => !PERSONAL_DOCUMENT_KEYS.has(d.document_key))

  const renderDocList = (docs: ApplicationDocumentRow[]) =>
    docs.length === 0 ? (
      <p className='py-8 text-center text-sm text-muted-foreground'>No documents in this section.</p>
    ) : (
      <div className='divide-y'>
        {docs.map(doc => {
          const docCfg = getDocumentStatusConfig(doc.verification_status)

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
                <button
                  type='button'
                  onClick={() => setPreviewDoc(doc)}
                  className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-muted transition'
                >
                  <EyeIcon className='size-3.5' /> Preview
                </button>
                {canVerifyDocuments && (
                  <DocumentDecisionActions documentId={doc.id} currentStatus={doc.verification_status} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    )

  return (
    <Card className='shadow-xs'>
      <CardHeader>
        <CardTitle className='text-base'>Uploaded Documents ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>No documents uploaded.</p>
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

      <Sheet open={!!previewDoc} onOpenChange={open => !open && setPreviewDoc(null)}>
        <SheetContent side='right' className='w-full sm:w-1/2 sm:max-w-none'>
          <SheetHeader className='border-b'>
            <SheetTitle className='flex items-center gap-2 text-[#0c2847]'>
              <FileIcon className='size-4' />
              {previewDoc?.label}
            </SheetTitle>
          </SheetHeader>

          <div className='min-h-0 flex-1 px-4 pb-4'>
            {previewDoc && (
              <iframe
                src={`/api/documents/${previewDoc.id}/preview`}
                title={previewDoc.label}
                className='size-full rounded-md border border-border/60'
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

export default ApplicationDocumentsSection
