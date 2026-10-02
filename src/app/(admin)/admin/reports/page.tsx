import type { Metadata } from 'next'

import { DownloadIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getApplicationStatusConfig, getDocumentStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Reports & Exports — IGM Admin Portal'
}

/**
 * Reports & Exports per .ai/REPORTS.md. Only what real data currently
 * supports is built: application status/category breakdowns and document
 * verification stats (both backed by existing tables). Payment, inventory,
 * draw, and allotment reports are not built — their source modules don't
 * exist yet (see /admin/payments, /admin/inventory, /admin/draw, /admin/allotment).
 */
const ReportsAdminPage = async () => {
  await requirePermission('report:view')

  const permissions = await getCurrentUserPermissions()
  const canExport = !!permissions?.has('report:export')

  const [byStatus, byCategory, byDocStatus] = await Promise.all([
    query<Array<{ status: string; count: number }>>(
      `SELECT status, COUNT(*) AS count FROM applications WHERE status != 'draft' GROUP BY status`
    ),
    query<Array<{ category: string; count: number }>>(
      `SELECT c.name AS category, COUNT(*) AS count FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.status != 'draft'
       GROUP BY c.name ORDER BY count DESC`
    ),
    query<Array<{ verification_status: string; count: number }>>(
      `SELECT verification_status, COUNT(*) AS count FROM application_documents GROUP BY verification_status`
    )
  ])

  const totalApplications = byStatus.reduce((sum, r) => sum + Number(r.count), 0)
  const totalDocuments = byDocStatus.reduce((sum, r) => sum + Number(r.count), 0)

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Reports & Exports</h1>
        <p className='text-sm text-muted-foreground'>Applications and document verification summaries, exportable as CSV.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <Card className='shadow-xs'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Applications by Status</CardTitle>
              <CardDescription className='text-xs'>{totalApplications} submitted applications</CardDescription>
            </div>
            {canExport && (
              <a
                href='/api/admin/reports/applications'
                className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted transition'
              >
                <DownloadIcon className='size-3.5' /> Export CSV
              </a>
            )}
          </CardHeader>
          <CardContent className='space-y-2'>
            {byStatus.map(row => {
              const cfg = getApplicationStatusConfig(row.status)
              const pct = totalApplications ? Math.round((Number(row.count) / totalApplications) * 100) : 0

              return (
                <div key={row.status} className='flex items-center gap-3'>
                  <span className={`w-32 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-bold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
                    <div className='h-full bg-[#0c2847]' style={{ width: `${pct}%` }} />
                  </div>
                  <span className='w-10 text-right text-xs font-semibold text-slate-700'>{row.count}</span>
                </div>
              )
            })}
            {byStatus.length === 0 && <p className='text-sm text-muted-foreground'>No data yet.</p>}
          </CardContent>
        </Card>

        <Card className='shadow-xs'>
          <CardHeader>
            <CardTitle className='text-base font-bold text-[#0c2847]'>Applications by Category</CardTitle>
            <CardDescription className='text-xs'>Across all commercial stall categories</CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {byCategory.map(row => {
              const pct = totalApplications ? Math.round((Number(row.count) / totalApplications) * 100) : 0

              return (
                <div key={row.category} className='flex items-center gap-3'>
                  <span className='w-40 shrink-0 truncate text-xs font-semibold text-slate-700'>{row.category}</span>
                  <div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
                    <div className='h-full bg-amber-500' style={{ width: `${pct}%` }} />
                  </div>
                  <span className='w-10 text-right text-xs font-semibold text-slate-700'>{row.count}</span>
                </div>
              )
            })}
            {byCategory.length === 0 && <p className='text-sm text-muted-foreground'>No data yet.</p>}
          </CardContent>
        </Card>

        <Card className='shadow-xs'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Document Verification</CardTitle>
              <CardDescription className='text-xs'>{totalDocuments} uploaded documents</CardDescription>
            </div>
            {canExport && (
              <a
                href='/api/admin/reports/documents'
                className='inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted transition'
              >
                <DownloadIcon className='size-3.5' /> Export CSV
              </a>
            )}
          </CardHeader>
          <CardContent className='space-y-2'>
            {byDocStatus.map(row => {
              const cfg = getDocumentStatusConfig(row.verification_status)
              const pct = totalDocuments ? Math.round((Number(row.count) / totalDocuments) * 100) : 0

              return (
                <div key={row.verification_status} className='flex items-center gap-3'>
                  <span className={`w-32 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-bold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <div className='h-2 flex-1 overflow-hidden rounded-full bg-muted'>
                    <div className='h-full bg-[#0c2847]' style={{ width: `${pct}%` }} />
                  </div>
                  <span className='w-10 text-right text-xs font-semibold text-slate-700'>{row.count}</span>
                </div>
              )
            })}
            {byDocStatus.length === 0 && <p className='text-sm text-muted-foreground'>No data yet.</p>}
          </CardContent>
        </Card>

        <Card className='border-dashed shadow-none'>
          <CardHeader>
            <CardTitle className='text-base font-bold text-muted-foreground'>Draw & Allotment Reports</CardTitle>
            <CardDescription className='text-xs'>These reports will be available once the Draw and Allotment features are live.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

export default ReportsAdminPage
