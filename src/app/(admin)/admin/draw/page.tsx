import type { Metadata } from 'next'
import Link from 'next/link'
import { ShuffleIcon, HistoryIcon, CheckCircle2Icon, ExternalLinkIcon, EyeIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { query } from '@/lib/db/client'
import { requirePermission, getCurrentUserPermissions } from '@/lib/rbac/authorize'
import DrawDashboardControl from '@/views/admin/draw/DrawDashboardControl'

export const metadata: Metadata = {
  title: 'Draw & Booth/Stall Allocation — IGM Admin Portal'
}

export const dynamic = 'force-dynamic'

type CategoryMetric = {
  id: number
  name: string
  slug: string
  selection_method: string
  eligibleCount: number
  availableStalls: number
}

type PastDrawEvent = {
  id: number
  draw_code: string
  category_name: string
  round_number: number
  status: string
  total_eligible_candidates: number
  total_available_stalls: number
  total_allotted: number
  total_waitlisted: number
  server_seed_hash: string
  client_seed: string
  executed_by_name: string
  created_at: string
}

export default async function DrawProcessPage() {
  await requirePermission('draw:view')
  const permissions = await getCurrentUserPermissions()
  const canRunDraw = !!permissions?.has('draw:run')

  // Fetch categories with live eligible candidates & available stalls
  const [categories, pastDraws] = await Promise.all([
    query<CategoryMetric[]>(
      `SELECT c.id, c.name, c.slug, c.selection_method,
              (SELECT COUNT(*) FROM applications a 
               LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
               WHERE a.category_id = c.id 
                 AND a.status IN ('approved', 'selected')
                 AND su.id IS NULL) AS eligibleCount,
              (SELECT COUNT(*) FROM shop_units su 
               WHERE su.category_id = c.id AND su.status = 'available') AS availableStalls
       FROM categories c
       WHERE c.status != 'archived'
       ORDER BY c.display_order ASC`
    ),
    query<PastDrawEvent[]>(
      `SELECT de.id, de.draw_code, c.name AS category_name, de.round_number, de.status,
              de.total_eligible_candidates, de.total_available_stalls, de.total_allotted,
              de.total_waitlisted, de.server_seed_hash, de.client_seed,
              u.full_name AS executed_by_name, de.created_at
       FROM draw_events de
       JOIN categories c ON c.id = de.category_id
       LEFT JOIN users u ON u.id = de.executed_by_user_id
       ORDER BY de.id DESC
       LIMIT 10`
    )
  ])

  return (
    <div className='flex flex-col gap-6'>
      {/* Page Title & Overview */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847] flex items-center gap-2.5'>
            <ShuffleIcon className='size-6 text-blue-600' />
            Draw & Booth/Stall Allocation Engine
          </h1>
          <p className='text-sm text-slate-500 mt-0.5'>
            Provably fair, deterministic randomization engine for oversubscribed commercial booth/stall allotments.
          </p>
        </div>
      </div>

      {/* Interactive Controls (Simulation & Execution) */}
      <DrawDashboardControl categories={categories} canRunDraw={canRunDraw} />

      {/* Historical Draw Records & Audits */}
      <Card className='shadow-xs border-slate-200 mt-2'>
        <CardHeader className='border-b bg-slate-50/60 py-4 px-6 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-base font-bold text-[#0c2847] flex items-center gap-2'>
              <HistoryIcon className='size-4 text-slate-600' />
              Executed Draw History & Audit Trails ({pastDraws.length})
            </CardTitle>
            <CardDescription className='text-xs text-slate-500'>
              All prior rounds executed with immutable cryptographic commit seeds.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='p-0 overflow-x-auto'>
          {pastDraws.length === 0 ? (
            <div className='py-12 text-center text-slate-500'>
              <ShuffleIcon className='size-10 mx-auto text-slate-300 mb-2' />
              <p className='text-sm font-semibold'>No draws have been executed yet.</p>
              <p className='text-xs text-slate-400 mt-0.5'>
                Select a category above to run a dry-run simulation or execute an official draw round.
              </p>
            </div>
          ) : (
            <table className='w-full text-left text-sm'>
              <thead className='border-b bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider'>
                <tr>
                  <th className='py-3.5 px-4'>Draw Reference</th>
                  <th className='py-3.5 px-4'>Category</th>
                  <th className='py-3.5 px-4'>Candidates / Booths/Stalls</th>
                  <th className='py-3.5 px-4'>Outcome</th>
                  <th className='py-3.5 px-4'>Cryptographic Proof</th>
                  <th className='py-3.5 px-4'>Executed By</th>
                  <th className='py-3.5 px-4'>Timestamp</th>
                  <th className='py-3.5 px-4 text-right'>Audit</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-200'>
                {pastDraws.map(draw => (
                  <tr key={draw.id} className='hover:bg-slate-50/80 transition'>
                    <td className='py-3.5 px-4 font-mono font-bold text-xs text-[#0c2847]'>
                      {draw.draw_code}
                    </td>
                    <td className='py-3.5 px-4 font-medium text-slate-800 text-xs'>
                      {draw.category_name} (R-{draw.round_number})
                    </td>
                    <td className='py-3.5 px-4 text-xs text-slate-600'>
                      <span className='font-semibold text-slate-900'>{draw.total_eligible_candidates}</span> eligible ·{' '}
                      <span className='font-semibold text-slate-900'>{draw.total_available_stalls}</span> booths/stalls
                    </td>
                    <td className='py-3.5 px-4'>
                      <div className='flex items-center gap-1.5'>
                        <span className='bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded'>
                          {draw.total_allotted} Allotted
                        </span>
                        {draw.total_waitlisted > 0 && (
                          <span className='bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded'>
                            {draw.total_waitlisted} WL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='py-3.5 px-4 font-mono text-[10px] text-slate-500' title={`Seed: ${draw.client_seed}`}>
                      SHA-256: {draw.server_seed_hash.slice(0, 12)}...
                    </td>
                    <td className='py-3.5 px-4 text-xs text-slate-700'>
                      {draw.executed_by_name || 'System Admin'}
                    </td>
                    <td className='py-3.5 px-4 text-xs text-slate-500'>
                      {new Date(draw.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className='py-3.5 px-4 text-right'>
                      <Link
                        href={`/admin/draw/${draw.id}`}
                        className='text-xs text-blue-700 hover:text-blue-900 font-semibold inline-flex items-center gap-1'
                      >
                        <EyeIcon className='size-3.5' /> Results &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
