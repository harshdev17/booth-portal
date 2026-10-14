import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon, ShieldCheckIcon, DownloadIcon, CheckCircle2Icon, StoreIcon, FileTextIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Draw Results & Cryptographic Audit — IGM Admin'
}

type DrawDetail = {
  id: number
  draw_code: string
  category_name: string
  round_number: number
  status: string
  total_eligible_candidates: number
  total_available_stalls: number
  total_allotted: number
  total_waitlisted: number
  server_seed: string
  server_seed_hash: string
  client_seed: string
  combined_seed_hash: string
  notes: string | null
  executed_by_name: string
  created_at: string
}

type AllocationRow = {
  id: number
  application_number: string
  representative_name: string
  organisation_name: string
  mobile_number: string
  stall_number: string | null
  direction: string | null
  allocation_type: 'allotted' | 'waitlist'
  draw_position: number
  waitlist_position: number | null
  verification_token: string
}

export default async function DrawResultsDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission('draw:view')

  const { id } = await params
  const drawId = Number(id)
  if (!Number.isInteger(drawId) || drawId <= 0) notFound()

  const [drawRows, allocations] = await Promise.all([
    query<DrawDetail[]>(
      `SELECT de.*, c.name AS category_name, u.full_name AS executed_by_name
       FROM draw_events de
       JOIN categories c ON c.id = de.category_id
       LEFT JOIN users u ON u.id = de.executed_by_user_id
       WHERE de.id = ? LIMIT 1`,
      [drawId]
    ),
    query<AllocationRow[]>(
      `SELECT da.id, a.application_number, a.representative_name, a.organisation_name,
              a.mobile_number, su.stall_number, su.direction,
              da.allocation_type, da.draw_position, da.waitlist_position, da.verification_token
       FROM draw_allocations da
       JOIN applications a ON a.id = da.application_id
       LEFT JOIN shop_units su ON su.id = da.shop_unit_id
       WHERE da.draw_event_id = ?
       ORDER BY da.draw_position ASC`,
      [drawId]
    )
  ])

  const draw = drawRows[0]
  if (!draw) notFound()

  return (
    <div className='flex flex-col gap-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between'>
        <Link
          href='/admin/draw'
          className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition'
        >
          <ArrowLeftIcon className='size-3.5' /> Back to Draw Process
        </Link>
        <span className='font-mono text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border'>
          Reference: {draw.draw_code}
        </span>
      </div>

      {/* Header Audit Card */}
      <Card className='shadow-xs border-slate-200'>
        <CardHeader className='border-b bg-slate-50/70 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <Badge className='bg-emerald-600 text-white font-bold text-xs uppercase px-2 py-0.5'>
                {draw.status}
              </Badge>
              <span className='text-xs text-slate-500 font-medium'>
                Round #{draw.round_number} · Category: <strong className='text-slate-900'>{draw.category_name}</strong>
              </span>
            </div>
            <CardTitle className='text-2xl font-bold text-[#0c2847]'>
              Official Allocation Outcomes
            </CardTitle>
            <CardDescription className='text-xs text-slate-500 mt-0.5'>
              Executed by {draw.executed_by_name} on {new Date(draw.created_at).toLocaleString('en-IN')}
            </CardDescription>
          </div>

          <div className='flex items-center gap-3'>
            <div className='bg-white border rounded-xl px-4 py-2 text-center shadow-2xs'>
              <span className='text-[10px] text-slate-400 font-bold uppercase block'>Allotted Booths/Stalls</span>
              <span className='text-xl font-extrabold text-emerald-700'>{draw.total_allotted}</span>
            </div>
            <div className='bg-white border rounded-xl px-4 py-2 text-center shadow-2xs'>
              <span className='text-[10px] text-slate-400 font-bold uppercase block'>Waiting List</span>
              <span className='text-xl font-extrabold text-amber-700'>{draw.total_waitlisted}</span>
            </div>
          </div>
        </CardHeader>

        {/* Cryptographic Proof Verification Block */}
        <CardContent className='p-6 border-b bg-slate-50/30'>
          <h4 className='text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5'>
            <ShieldCheckIcon className='size-4 text-blue-600' />
            Provably Fair Cryptographic Audit Verification
          </h4>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
            <div className='p-3 bg-white border rounded-lg font-mono'>
              <span className='text-[10px] text-slate-400 block font-sans uppercase font-bold'>Server Seed (Revealed)</span>
              <span className='text-slate-900 break-all select-all'>{draw.server_seed}</span>
            </div>
            <div className='p-3 bg-white border rounded-lg font-mono'>
              <span className='text-[10px] text-slate-400 block font-sans uppercase font-bold'>Server Seed SHA-256 Hash (Pre-Committed)</span>
              <span className='text-slate-900 break-all select-all'>{draw.server_seed_hash}</span>
            </div>
            <div className='p-3 bg-white border rounded-lg font-mono'>
              <span className='text-[10px] text-slate-400 block font-sans uppercase font-bold'>Client Entropy Seed (Committee Witnessed)</span>
              <span className='text-slate-900 break-all select-all'>{draw.client_seed}</span>
            </div>
            <div className='p-3 bg-white border rounded-lg font-mono'>
              <span className='text-[10px] text-slate-400 block font-sans uppercase font-bold'>Combined Synthesis HMAC Hash</span>
              <span className='text-slate-900 break-all select-all'>{draw.combined_seed_hash}</span>
            </div>
          </div>
        </CardContent>

        {/* Allocations Table */}
        <CardContent className='p-0 overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-slate-100 font-bold text-slate-600 border-b uppercase text-[11px]'>
              <tr>
                <th className='py-3 px-4'>Drawn Pos</th>
                <th className='py-3 px-4'>Application No</th>
                <th className='py-3 px-4'>Applicant Name / Firm</th>
                <th className='py-3 px-4'>Mobile</th>
                <th className='py-3 px-4'>Assigned Booth/Stall</th>
                <th className='py-3 px-4'>Result Category</th>
                <th className='py-3 px-4 text-right'>Verification Token</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {allocations.map(a => (
                <tr key={a.id} className='hover:bg-slate-50 transition'>
                  <td className='py-3 px-4 font-mono font-bold text-slate-900'>{a.draw_position}</td>
                  <td className='py-3 px-4 font-mono font-semibold text-blue-950'>{a.application_number}</td>
                  <td className='py-3 px-4'>
                    <div className='font-bold text-slate-900'>{a.representative_name}</div>
                    {a.organisation_name && a.organisation_name !== '—' && (
                      <div className='text-[11px] text-slate-500'>{a.organisation_name}</div>
                    )}
                  </td>
                  <td className='py-3 px-4 font-mono text-slate-700'>+91 {a.mobile_number}</td>
                  <td className='py-3 px-4 font-mono'>
                    {a.stall_number ? (
                      <span className='inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded'>
                        <StoreIcon className='size-3 text-blue-700' /> Stall #{a.stall_number}
                      </span>
                    ) : (
                      <span className='text-slate-400 italic'>None (Waitlist)</span>
                    )}
                  </td>
                  <td className='py-3 px-4'>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        a.allocation_type === 'allotted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {a.allocation_type === 'allotted'
                        ? 'Allotted Winner'
                        : `Waitlist #${a.waitlist_position}`}
                    </span>
                  </td>
                  <td className='py-3 px-4 font-mono text-[10px] text-slate-400 text-right select-all'>
                    {a.verification_token.slice(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
