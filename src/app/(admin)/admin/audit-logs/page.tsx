import type { Metadata } from 'next'

import Link from 'next/link'

import { ShieldAlertIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Audit Logs — KDB Admin Portal'
}

type AuditRow = {
  id: number
  action: string
  module: string
  entity_type: string | null
  entity_id: string | null
  actor_role_key: string | null
  actor_name: string | null
  previous_value: string | null
  new_value: string | null
  created_at: string
}

const PAGE_SIZE = 40

/**
 * Read-only audit trail viewer per .ai/AUDIT_LOGS.md — this table is
 * append-only everywhere else in the codebase (src/lib/audit/log.ts), and
 * this page deliberately exposes no edit/delete action, only view + module
 * filter + search, matching "read-only to all roles" (.ai/ADMIN_TRANSFORMATION_PLAN.md §11).
 */
const AuditLogsPage = async ({
  searchParams
}: {
  searchParams: Promise<{ module?: string; q?: string; page?: string }>
}) => {
  await requirePermission('audit:view')

  const { module, q, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const conditions: string[] = []
  const params: unknown[] = []

  if (module && module !== 'all') {
    conditions.push('al.module = ?')
    params.push(module)
  }

  if (q && q.trim()) {
    conditions.push('(al.action LIKE ? OR al.entity_id LIKE ? OR u.full_name LIKE ?)')
    const pattern = `%${q.trim()}%`

    params.push(pattern, pattern, pattern)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [entries, modules, countRows] = await Promise.all([
    query<AuditRow[]>(
      `SELECT al.id, al.action, al.module, al.entity_type, al.entity_id, al.actor_role_key, u.full_name AS actor_name,
              al.previous_value, al.new_value, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      params
    ),
    query<Array<{ module: string }>>(`SELECT DISTINCT module FROM audit_logs ORDER BY module ASC`),
    query<Array<{ total: number }>>(`SELECT COUNT(*) AS total FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_user_id ${whereClause}`, params)
  ])

  const total = countRows[0]?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams()
    const merged = { module, q, page: String(page), ...overrides }

    if (merged.module && merged.module !== 'all') sp.set('module', merged.module)
    if (merged.q) sp.set('q', merged.q)
    if (merged.page && merged.page !== '1') sp.set('page', merged.page)

    const qs = sp.toString()

    return qs ? `/admin/audit-logs?${qs}` : '/admin/audit-logs'
  }

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Audit Logs</h1>
        <p className='text-sm text-muted-foreground'>
          Append-only record of every consequential action taken in the portal. Read-only.
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardContent className='flex flex-col gap-3 pt-6 sm:flex-row'>
          <form method='GET' className='flex flex-1 gap-3'>
            <Input name='q' defaultValue={q} placeholder='Search by action, entity ID or actor name...' className='flex-1' />
            <select
              name='module'
              defaultValue={module ?? 'all'}
              className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm'
            >
              <option value='all'>All Modules</option>
              {modules.map(m => (
                <option key={m.module} value={m.module}>
                  {m.module}
                </option>
              ))}
            </select>
            <button
              type='submit'
              className='inline-flex items-center justify-center rounded-md bg-[#0c2847] px-4 py-2 text-sm font-semibold text-white hover:bg-[#071f3a] transition'
            >
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Log Entries</CardTitle>
          <CardDescription className='text-xs'>
            {total} total · page {page} of {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {entries.length === 0 ? (
            <div className='py-12 text-center'>
              <ShieldAlertIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No audit entries match these filters.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
                  <tr>
                    <th className='py-3 px-4'>When</th>
                    <th className='py-3 px-4'>Actor</th>
                    <th className='py-3 px-4'>Module</th>
                    <th className='py-3 px-4'>Action</th>
                    <th className='py-3 px-4'>Entity</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {entries.map(entry => (
                    <tr key={entry.id} className='align-top hover:bg-muted/30 transition'>
                      <td className='py-3 px-4 text-xs whitespace-nowrap text-muted-foreground'>
                        {new Date(entry.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className='py-3 px-4 text-xs'>
                        <p className='font-semibold text-slate-800'>{entry.actor_name ?? 'System'}</p>
                        <p className='text-muted-foreground'>{entry.actor_role_key ?? '—'}</p>
                      </td>
                      <td className='py-3 px-4'>
                        <span className='rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'>
                          {entry.module}
                        </span>
                      </td>
                      <td className='py-3 px-4 font-mono text-xs text-[#0c2847]'>{entry.action}</td>
                      <td className='py-3 px-4 text-xs text-muted-foreground'>
                        {entry.entity_type ? `${entry.entity_type} #${entry.entity_id}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className='flex items-center justify-between text-sm'>
          <Link
            href={buildUrl({ page: String(Math.max(1, page - 1)) })}
            aria-disabled={page <= 1}
            className={`rounded-md border px-3 py-1.5 ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-muted'}`}
          >
            Previous
          </Link>
          <span className='text-muted-foreground'>
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}
            aria-disabled={page >= totalPages}
            className={`rounded-md border px-3 py-1.5 ${page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-muted'}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  )
}

export default AuditLogsPage
