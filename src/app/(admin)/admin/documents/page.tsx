import type { Metadata } from 'next'

import Link from 'next/link'

import { FileCheck2Icon, SearchIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import TablePagination from '@/components/shared/TablePagination'
import { getDocumentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import DocumentDecisionActions from '@/views/admin/documents/DocumentDecisionActions'

export const metadata: Metadata = {
  title: 'Document Verification — KDB Admin Portal'
}

const PAGE_SIZE = 20

const VALID_SORT_FIELDS: Record<string, string> = {
  uploaded: 'ad.created_at',
  applicant: 'a.representative_name',
  document: 'cdd.label'
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

const DocumentsAdminPage = async ({
  searchParams
}: {
  searchParams: Promise<{ status?: string; q?: string; sort?: string; dir?: 'asc' | 'desc'; page?: string }>
}) => {
  await requirePermission('document:view')

  const { status = 'pending', q, sort = 'uploaded', dir = 'asc', page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const offset = (page - 1) * PAGE_SIZE
  const permissions = await getCurrentUserPermissions()
  const canVerify = !!permissions?.has('document:verify')

  const conditions: string[] = []
  const params: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('ad.verification_status = ?')
    params.push(status)
  }

  if (q && q.trim()) {
    conditions.push('(a.application_number LIKE ? OR a.representative_name LIKE ? OR cdd.label LIKE ?)')
    const pattern = `%${q.trim()}%`

    params.push(pattern, pattern, pattern)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = VALID_SORT_FIELDS[sort] ?? 'ad.created_at'
  const sortDir = dir.toLowerCase() === 'desc' ? 'DESC' : 'ASC'

  const [documents, countRows] = await Promise.all([
    query<DocumentQueueRow[]>(
      `SELECT ad.id, ad.application_id, a.application_number, a.representative_name, c.name AS category_name,
              cdd.label, ad.original_filename, ad.verification_status, ad.verification_remarks, ad.created_at
       FROM application_documents ad
       JOIN applications a ON a.id = ad.application_id
       JOIN categories c ON c.id = a.category_id
       JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    ),
    query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total
       FROM application_documents ad
       JOIN applications a ON a.id = ad.application_id
       JOIN category_document_definitions cdd ON cdd.id = ad.document_definition_id
       ${whereClause}`,
      params
    )
  ])

  const total = countRows[0]?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const statusTabs: Array<{ key: string; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'query', label: 'Query Raised' },
    { key: 'verified', label: 'Verified' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' }
  ]

  const buildUrl = (overrides: { sort?: string; dir?: string; page?: number; status?: string }) => {
    const sp = new URLSearchParams()
    const merged = { sort, dir, page, status, ...overrides }

    if (merged.status && merged.status !== 'pending') sp.set('status', merged.status)
    if (q) sp.set('q', q)
    if (merged.sort) sp.set('sort', merged.sort)
    if (merged.dir) sp.set('dir', merged.dir)
    if (merged.page && merged.page > 1) sp.set('page', String(merged.page))

    const qs = sp.toString()

    return qs ? `/admin/documents?${qs}` : '/admin/documents'
  }

  const getSortUrl = (columnKey: string) => {
    const isCurrent = sort === columnKey
    const nextDir = isCurrent && dir === 'asc' ? 'desc' : 'asc'

    return buildUrl({ sort: columnKey, dir: nextDir, page: 1 })
  }

  const getSortIcon = (columnKey: string) => {
    if (sort !== columnKey) return <span className='ml-1 opacity-30 select-none text-[11px]'>↕</span>

    return dir === 'asc' ? (
      <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↑</span>
    ) : (
      <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↓</span>
    )
  }

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
            href={buildUrl({ status: tab.key, page: 1 })}
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
        <CardContent className='pt-6'>
          <form method='GET' className='relative'>
            <input type='hidden' name='status' value={status} />
            <input type='hidden' name='sort' value={sort} />
            <input type='hidden' name='dir' value={dir} />
            <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input name='q' defaultValue={q} placeholder='Search by application number, applicant or document type...' className='pl-9' />
          </form>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Documents</CardTitle>
              <CardDescription className='text-xs'>{total} document(s)</CardDescription>
            </div>
            <div className='flex gap-3 text-xs font-semibold text-muted-foreground'>
              <Link href={getSortUrl('uploaded')} className='hover:text-[#0c2847] transition'>
                Uploaded {getSortIcon('uploaded')}
              </Link>
              <Link href={getSortUrl('applicant')} className='hover:text-[#0c2847] transition'>
                Applicant {getSortIcon('applicant')}
              </Link>
              <Link href={getSortUrl('document')} className='hover:text-[#0c2847] transition'>
                Document {getSortIcon('document')}
              </Link>
            </div>
          </div>
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
        <TablePagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          buildUrl={targetPage => buildUrl({ page: targetPage })}
        />
      </Card>
    </div>
  )
}

export default DocumentsAdminPage
