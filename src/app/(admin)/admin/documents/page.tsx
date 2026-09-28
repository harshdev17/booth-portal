import type { Metadata } from 'next'

import Link from 'next/link'

import { FileCheck2Icon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import DocumentDecisionActions from '@/views/admin/documents/DocumentDecisionActions'

export const metadata: Metadata = {
  title: 'Document Verification — KDB Admin Portal'
}

type DocumentQueueRow = {
  id: number
  application_id: number
  application_number: string
  representative_name: string
  category_name: string
  label: string
  original_filename: string
  verification_status: string
  verification_remarks: string | null
  created_at: string
}

const DocumentsAdminPage = async ({ searchParams }: { searchParams: Promise<{ status?: string }> }) => {
  await requirePermission('document:view')

  const { status = 'pending' } = await searchParams
  const permissions = await getCurrentUserPermissions()
  const canVerify = !!permissions?.has('document:verify')

  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('ad.verification_status = ?')
    params.push(status)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const documents = await query<DocumentQueueRow[]>(
    `SELECT ad.id, ad.application_id, a.application_number, a.representative_name, c.name AS category_name,
            cdd.label, ad.original_filename, ad.verification_status, ad.verification_remarks, ad.created_at
     FROM application_documents ad
     JOIN applications a ON a.id = ad.application_id
     JOIN categories c ON c.id = a.category_id
     JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
     ${whereClause}
     ORDER BY ad.created_at ASC
     LIMIT 150`,
    params
  )

  const statusTabs: Array<{ key: string; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'query', label: 'Query Raised' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Document Verification</h1>
        <p className='text-sm text-muted-foreground'>Review uploaded applicant documents and record a verification decision.</p>
      </div>

      <div className='flex flex-wrap gap-2'>
        {statusTabs.map(tab => (
          <Link
            key={tab.key}
            href={`/admin/documents?status=${tab.key}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === tab.key
                ? 'bg-[#0c2847] text-white'
                : 'border border-border bg-white text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Documents</CardTitle>
          <CardDescription className='text-xs'>Showing {documents.length} document(s)</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {documents.length === 0 ? (
            <div className='py-12 text-center'>
              <FileCheck2Icon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No documents in this queue.</p>
            </div>
          ) : (
            <div className='divide-y'>
              {documents.map(doc => {
                const docCfg = getDocumentStatusConfig(doc.verification_status)

                return (
                  <div key={doc.id} className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <Link
                          href={`/admin/applications/${doc.application_id}`}
                          className='font-mono text-sm font-bold text-[#0c2847] hover:underline'
                        >
                          {doc.application_number}
                        </Link>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${docCfg.color}`}>
                          {docCfg.label}
                        </span>
                      </div>
                      <p className='text-sm text-slate-700'>
                        {doc.label} · {doc.representative_name} · {doc.category_name}
                      </p>
                      <p className='text-xs text-muted-foreground'>{doc.original_filename}</p>
                      {doc.verification_remarks && (
                        <p className='mt-1 text-xs text-amber-700'>Remark: {doc.verification_remarks}</p>
                      )}
                    </div>

                    {canVerify && doc.verification_status !== 'verified' && (
                      <DocumentDecisionActions documentId={doc.id} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DocumentsAdminPage
