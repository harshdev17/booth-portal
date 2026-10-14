import type { Metadata } from 'next'

import Link from 'next/link'

import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileCheck2Icon,
  FileTextIcon,
  IndianRupeeIcon,
  MapPinIcon,
  ShuffleIcon,
  StoreIcon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import KpiCard from '@/components/shared/KpiCard'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions } from '@/lib/rbac/authorize'
import CategoryBreakdownChart from '@/views/admin/dashboard/CategoryBreakdownChart'
import SubmissionsTrendChart from '@/views/admin/dashboard/SubmissionsTrendChart'

export const metadata: Metadata = {
  title: 'Dashboard — IGM Admin Portal'
}

const TREND_DAYS = 14

const DashboardPage = async () => {
  const session = await getSession()
  const permissions = await getCurrentUserPermissions()

  const [
    statusRows,
    categoryRows,
    trendRows,
    docStatusRows,
    stallStats,
    categoryStalls,
    drawStats,
    paymentStats,
    topDistricts
  ] = await Promise.all([
    query<Array<{ status: string; count: number }>>(
      `SELECT status, COUNT(*) AS count FROM applications WHERE status != 'draft' GROUP BY status`
    ),
    query<Array<{ category: string; count: number }>>(
      `SELECT c.name AS category, COUNT(*) AS count FROM applications a
       JOIN categories c ON c.id = a.category_id
       WHERE a.status != 'draft'
       GROUP BY c.name ORDER BY count DESC LIMIT 10`
    ),
    query<Array<{ date: string; count: number }>>(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count FROM applications
       WHERE status != 'draft' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${TREND_DAYS - 1} DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`
    ),
    query<Array<{ verification_status: string; count: number }>>(
      `SELECT verification_status, COUNT(*) AS count FROM application_documents GROUP BY verification_status`
    ),
    query<Array<{ total_stalls: number; available_stalls: number; allotted_stalls: number; reserved_stalls: number }>>(
      `SELECT 
         COUNT(*) AS total_stalls,
         SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_stalls,
         SUM(CASE WHEN status = 'allotted' THEN 1 ELSE 0 END) AS allotted_stalls,
         SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved_stalls
       FROM shop_units`
    ),
    query<Array<{ category_name: string; selection_method: string; total_stalls: number; available_stalls: number; allotted_stalls: number }>>(
      `SELECT 
         c.name AS category_name,
         c.selection_method,
         COUNT(su.id) AS total_stalls,
         SUM(CASE WHEN su.status = 'available' THEN 1 ELSE 0 END) AS available_stalls,
         SUM(CASE WHEN su.status = 'allotted' THEN 1 ELSE 0 END) AS allotted_stalls
       FROM categories c
       JOIN shop_units su ON su.category_id = c.id
       GROUP BY c.id, c.name, c.selection_method
       ORDER BY total_stalls DESC`
    ),
    query<Array<{ total_draws: number; total_allotted: number; total_waitlisted: number }>>(
      `SELECT 
         COUNT(*) AS total_draws,
         COALESCE(SUM(total_allotted), 0) AS total_allotted,
         COALESCE(SUM(total_waitlisted), 0) AS total_waitlisted
       FROM draw_events`
    ),
    query<Array<{ total_payments: number; total_paid_paise: number; successful_payments: number }>>(
      `SELECT 
         COUNT(*) AS total_payments,
         COALESCE(SUM(CASE WHEN status = 'success' THEN amount_paise ELSE 0 END), 0) AS total_paid_paise,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successful_payments
       FROM payments`
    ),
    query<Array<{ district: string; count: number }>>(
      `SELECT district, COUNT(*) AS count 
       FROM applications 
       WHERE district IS NOT NULL AND district != '' AND district != 'Pending'
       GROUP BY district 
       ORDER BY count DESC 
       LIMIT 6`
    )
  ])

  const getCount = (status: string) => statusRows.find(r => r.status === status)?.count ?? 0
  const totalSubmitted = statusRows.reduce((sum, r) => sum + Number(r.count), 0)
  const underReview = getCount('under_review') + getCount('payment_success')
  const selected = getCount('selected') + getCount('allotted')
  const docsPending = docStatusRows.find(r => r.verification_status === 'pending')?.count ?? 0
  const openQueries = docStatusRows.find(r => r.verification_status === 'query')?.count ?? 0

  // Stall inventory metrics
  const totalStalls = Number(stallStats[0]?.total_stalls ?? 0)
  const availableStalls = Number(stallStats[0]?.available_stalls ?? 0)
  const allottedStalls = Number(stallStats[0]?.allotted_stalls ?? 0)
  const occupancyRate = totalStalls > 0 ? Math.round((allottedStalls / totalStalls) * 100) : 0

  // Lucky Draw metrics
  const totalDrawRounds = Number(drawStats[0]?.total_draws ?? 0)
  const drawAllotted = Number(drawStats[0]?.total_allotted ?? 0)
  const drawWaitlisted = Number(drawStats[0]?.total_waitlisted ?? 0)

  // Payments & Revenue
  const totalPaidINR = Math.round(Number(paymentStats[0]?.total_paid_paise ?? 0) / 100)
  const successfulPayments = Number(paymentStats[0]?.successful_payments ?? 0)

  // Fill in gap days for the 14-day trend chart
  const trendMap = new Map(trendRows.map(r => [r.date.slice(0, 10), Number(r.count)]))
  const trendData: Array<{ date: string; count: number }> = []

  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    trendData.push({ date: key, count: trendMap.get(key) ?? 0 })
  }

  const kpis = [
    {
      label: 'Total Applications',
      value: totalSubmitted,
      icon: FileTextIcon,
      color: 'text-[#0c2847]',
      href: '/admin/applications',
      hint: 'All submitted booth/stall applications'
    },
    {
      label: 'Under Review',
      value: underReview,
      icon: ClockIcon,
      color: 'text-blue-600',
      href: '/admin/applications?status=under_review',
      hint: 'Awaiting verification decision'
    },
    {
      label: 'Allotted / Selected',
      value: selected,
      icon: CheckCircle2Icon,
      color: 'text-purple-600',
      href: '/admin/applications?status=selected',
      hint: 'Winners & approved allotments'
    },
    {
      label: 'Available Booths/Stalls',
      value: availableStalls,
      icon: StoreIcon,
      color: 'text-emerald-600',
      href: '/admin/inventory',
      hint: 'Physical booths/stalls ready for draw'
    },
    {
      label: 'Documents Pending',
      value: docsPending,
      icon: FileCheck2Icon,
      color: 'text-amber-600',
      href: '/admin/documents',
      hint: 'Uploaded documents to verify'
    },
    {
      label: 'Fees Realized',
      value: `₹${totalPaidINR.toLocaleString('en-IN')}`,
      icon: IndianRupeeIcon,
      color: 'text-emerald-700',
      href: '/admin/payments',
      hint: `${successfulPayments} verified payments`
    }
  ]

  return (
    <div className='flex flex-col gap-5'>
      {/* Page Title */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Admin Command Dashboard</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Welcome back, {session?.fullName} ({session?.role.name})
          </p>
        </div>
        <div>
          <Badge variant='outline' className='bg-blue-50/50 text-blue-900 border-blue-200 text-xs py-0.5 px-2.5 font-medium'>
            IGM 2026 Portal Active
          </Badge>
        </div>
      </div>

      {/* KPI strip */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
        {kpis.map(kpi => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            accentColor={kpi.color}
            hint={kpi.hint}
            href={kpi.href}
            compact
          />
        ))}
      </div>

      {/* Main Grid: 2 Columns Left, 1 Column Right */}
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-3 items-start'>
        {/* Left Column (2 Cols): Charts & Regional Distribution */}
        <div className='flex flex-col gap-4 lg:col-span-2'>
          {/* Submissions Velocity Chart */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden'>
            <div className='px-4 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between'>
              <div>
                <h2 className='text-sm font-bold text-[#0c2847]'>
                  Application Velocity — Last {TREND_DAYS} Days
                </h2>
                <p className='text-xs text-slate-500 mt-0.5'>Daily applicant submissions volume</p>
              </div>
              <Badge variant='outline' className='text-[10px] font-mono'>
                {trendData.reduce((s, r) => s + r.count, 0)} recent submissions
              </Badge>
            </div>
            <div className='p-4'>
              <SubmissionsTrendChart data={trendData} />
            </div>
          </div>

          {/* Applications by Category Chart */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden'>
            <div className='px-4 py-3.5 border-b border-slate-100 bg-slate-50/50'>
              <h2 className='text-sm font-bold text-[#0c2847]'>Applications by Booth/Stall Category</h2>
              <p className='text-xs text-slate-500 mt-0.5'>Applicant demand across categories</p>
            </div>
            <div className='p-4'>
              {categoryRows.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>No submissions recorded yet.</p>
              ) : (
                <CategoryBreakdownChart data={categoryRows} />
              )}
            </div>
          </div>

          {/* Regional Representation (Applicant Origin Districts) */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden'>
            <div className='px-4 py-3 border-b border-slate-100 bg-slate-50/50'>
              <h2 className='text-sm font-bold text-[#0c2847] flex items-center gap-1.5'>
                <MapPinIcon className='size-3.5 text-slate-600' />
                Regional Participation (Top Districts)
              </h2>
              <p className='text-xs text-slate-500 mt-0.5'>
                Geographic diversity of artisan and vendor applicants
              </p>
            </div>
            <div className='p-4'>
              {topDistricts.length === 0 ? (
                <p className='py-4 text-center text-xs text-muted-foreground'>No district data recorded yet.</p>
              ) : (
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5'>
                  {topDistricts.map(d => (
                    <div
                      key={d.district}
                      className='flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/70 text-xs'
                    >
                      <span className='font-medium text-slate-800 capitalize truncate max-w-[100px]'>
                        {d.district.toLowerCase()}
                      </span>
                      <span className='font-mono font-bold text-slate-900 text-[11px] shrink-0'>
                        {d.count} apps
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Actionable Team Worklist & Live System Insights */}
        <div className='flex flex-col gap-4'>
          {/* 1. Team Action Queue */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden'>
            <div className='px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between'>
              <div>
                <h2 className='text-xs font-bold text-[#0c2847] uppercase tracking-wider flex items-center gap-1.5'>
                  <AlertCircleIcon className='size-3.5 text-amber-600' />
                  Team Action Required
                </h2>
                <p className='text-[11px] text-slate-500 mt-0.5'>
                  Items awaiting administrative verification
                </p>
              </div>
              <Badge variant='outline' className='bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold'>
                {docsPending + underReview} Pending
              </Badge>
            </div>

            <div className='divide-y divide-slate-100'>
              {/* Document Queue */}
              <Link
                href='/admin/documents'
                className='flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition group'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60'>
                    <FileCheck2Icon className='size-4' />
                  </div>
                  <div className='min-w-0'>
                    <div className='text-xs font-semibold text-slate-900 group-hover:text-[#0c2847] truncate'>
                      Document Verification
                    </div>
                    <div className='text-[11px] text-slate-500 truncate'>
                      {docsPending} document{docsPending === 1 ? '' : 's'} waiting for sign-off
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0 ml-3'>
                  <Badge variant='outline' className='bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold'>
                    {docsPending}
                  </Badge>
                  <ArrowRightIcon className='size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition' />
                </div>
              </Link>

              {/* Scrutiny Queue */}
              <Link
                href='/admin/applications?status=under_review'
                className='flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition group'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60'>
                    <ClockIcon className='size-4' />
                  </div>
                  <div className='min-w-0'>
                    <div className='text-xs font-semibold text-slate-900 group-hover:text-[#0c2847] truncate'>
                      Applications Under Review
                    </div>
                    <div className='text-[11px] text-slate-500 truncate'>
                      {underReview} applicant{underReview === 1 ? '' : 's'} awaiting committee decision
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0 ml-3'>
                  <Badge variant='outline' className='bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold'>
                    {underReview}
                  </Badge>
                  <ArrowRightIcon className='size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition' />
                </div>
              </Link>

              {/* Queries Queue */}
              {openQueries > 0 && (
                <Link
                  href='/admin/applications?status=query_raised'
                  className='flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition group'
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 border border-orange-200/60'>
                      <AlertCircleIcon className='size-4' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-xs font-semibold text-slate-900 group-hover:text-[#0c2847] truncate'>
                        Open Document Queries
                      </div>
                      <div className='text-[11px] text-slate-500 truncate'>
                        {openQueries} query raised pending applicant action
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 shrink-0 ml-3'>
                    <Badge variant='outline' className='bg-orange-50 text-orange-800 border-orange-200 text-[10px] font-bold'>
                      {openQueries}
                    </Badge>
                    <ArrowRightIcon className='size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition' />
                  </div>
                </Link>
              )}

              {/* Draw Queue */}
              <Link
                href='/admin/draw'
                className='flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition group'
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60'>
                    <ShuffleIcon className='size-4' />
                  </div>
                  <div className='min-w-0'>
                    <div className='text-xs font-semibold text-slate-900 group-hover:text-[#0c2847] truncate'>
                      Draw Panel
                    </div>
                    <div className='text-[11px] text-slate-500 truncate'>
                      Verified applicant pools ready for allotment
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2 shrink-0 ml-3'>
                  <ArrowRightIcon className='size-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition' />
                </div>
              </Link>
            </div>
          </div>

          {/* 2. Stall Inventory & Allotment Health */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden'>
            <div className='px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between'>
              <div>
                <h2 className='text-xs font-bold text-[#0c2847] uppercase tracking-wider flex items-center gap-1.5'>
                  <StoreIcon className='size-3.5 text-emerald-700' />
                  Booth/Stall Allotment Health
                </h2>
                <p className='text-[11px] text-slate-500 mt-0.5'>
                  Physical booths/stalls occupancy and allocation
                </p>
              </div>
              <Link
                href='/admin/inventory'
                className='text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1'
              >
                Manage <ArrowRightIcon className='size-3' />
              </Link>
            </div>
            <div className='p-4 space-y-3.5'>
              {/* Summary 3-pill grid */}
              <div className='grid grid-cols-3 gap-2 text-center'>
                <div className='p-2 rounded-lg bg-slate-50 border border-slate-100'>
                  <div className='text-xs font-bold text-slate-900 font-mono'>{totalStalls}</div>
                  <div className='text-[10px] text-slate-500'>Total Units</div>
                </div>
                <div className='p-2 rounded-lg bg-emerald-50/60 border border-emerald-100'>
                  <div className='text-xs font-bold text-emerald-800 font-mono'>{availableStalls}</div>
                  <div className='text-[10px] text-emerald-700 font-medium'>Available</div>
                </div>
                <div className='p-2 rounded-lg bg-purple-50/60 border border-purple-100'>
                  <div className='text-xs font-bold text-purple-800 font-mono'>{allottedStalls}</div>
                  <div className='text-[10px] text-purple-700 font-medium'>Allotted</div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className='flex justify-between text-[11px] text-slate-600 mb-1'>
                  <span>Overall Allotment</span>
                  <span className='font-semibold'>{occupancyRate}%</span>
                </div>
                <div className='w-full h-1.5 rounded-full bg-slate-100 overflow-hidden'>
                  <div
                    className='h-full bg-emerald-600 rounded-full transition-all'
                    style={{ width: `${Math.max(occupancyRate, 0)}%` }}
                  />
                </div>
              </div>

              {/* Category rows */}
              <div className='space-y-1.5 pt-2 border-t border-slate-100'>
                {categoryStalls.map(cs => (
                  <div
                    key={cs.category_name}
                    className='flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/70 border border-slate-100'
                  >
                    <span className='truncate font-medium text-slate-800 text-[11px] max-w-[150px]'>
                      {cs.category_name}
                    </span>
                    <div className='flex items-center gap-1.5 shrink-0'>
                      <Badge
                        variant='outline'
                        className={`text-[9px] px-1 py-0 uppercase font-mono ${
                          cs.selection_method === 'draw'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : cs.selection_method === 'auction'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {cs.selection_method}
                      </Badge>
                      <span className='font-mono font-bold text-[11px] text-slate-700'>
                        {cs.allotted_stalls}/{cs.total_stalls}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Lucky Draw Engine Status */}
          <div className='rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden'>
            <div className='px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between'>
              <div>
                <h2 className='text-xs font-bold text-[#0c2847] uppercase tracking-wider flex items-center gap-1.5'>
                  <ShuffleIcon className='size-3.5 text-purple-600' />
                  Draw System
                </h2>
                <p className='text-[11px] text-slate-500 mt-0.5'>
                  Provably fair cryptographic draw rounds
                </p>
              </div>
              <Badge variant='outline' className='bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-mono'>
                SHA-256
              </Badge>
            </div>
            <div className='p-4 space-y-3.5'>
              <div className='grid grid-cols-3 gap-2 text-center'>
                <div className='p-2 rounded-lg bg-slate-50 border border-slate-100'>
                  <div className='text-xs font-bold text-slate-900 font-mono'>{totalDrawRounds}</div>
                  <div className='text-[10px] text-slate-500'>Rounds</div>
                </div>
                <div className='p-2 rounded-lg bg-slate-50 border border-slate-100'>
                  <div className='text-xs font-bold text-emerald-700 font-mono'>{drawAllotted}</div>
                  <div className='text-[10px] text-slate-500'>Allotted</div>
                </div>
                <div className='p-2 rounded-lg bg-slate-50 border border-slate-100'>
                  <div className='text-xs font-bold text-amber-700 font-mono'>{drawWaitlisted}</div>
                  <div className='text-[10px] text-slate-500'>Waitlisted</div>
                </div>
              </div>

              <Link
                href='/admin/draw'
                className='w-full py-2.5 px-3 text-xs font-semibold rounded-lg bg-[#0c2847] hover:bg-[#12365c] text-white flex items-center justify-center gap-1.5 transition shadow-xs'
              >
                <ShuffleIcon className='size-3.5' />
                Open Draw Control Room
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
