import type { Metadata } from 'next'

import Link from 'next/link'

import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileCheck2Icon,
  FileTextIcon,
  ShieldAlertIcon,
  XCircleIcon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions } from '@/lib/rbac/authorize'
import CategoryBreakdownChart from '@/views/admin/dashboard/CategoryBreakdownChart'
import SubmissionsTrendChart from '@/views/admin/dashboard/SubmissionsTrendChart'

export const metadata: Metadata = {
  title: 'Dashboard — KDB Admin Portal'
}

const TREND_DAYS = 14

/**
 * Real KPIs replacing the Phase 5 placeholder, per .ai/ADMIN_PANEL.md
 * Section 3 — built from applications/documents/audit_logs, the tables that
 * actually exist. Payment/Inventory/Allotment KPIs are deliberately not
 * shown here (no fabricated numbers) since those modules don't exist yet —
 * see /admin/payments, /admin/inventory, /admin/allotment.
 */
const DashboardPage = async () => {
  const session = await getSession()
  const permissions = await getCurrentUserPermissions()

  const [statusRows, categoryRows, trendRows, docStatusRows, recentAudit] = await Promise.all([
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
    query<Array<{ id: number; action: string; actor_name: string | null; module: string; created_at: string }>>(
      `SELECT al.id, al.action, u.full_name AS actor_name, al.module, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       ORDER BY al.created_at DESC
       LIMIT 8`
    )
  ])

  const getCount = (status: string) => statusRows.find(r => r.status === status)?.count ?? 0
  const totalSubmitted = statusRows.reduce((sum, r) => sum + Number(r.count), 0)
  const underReview = getCount('under_review')
  const selected = getCount('selected') + getCount('allotted')
  const rejected = getCount('rejected')
  const paymentPending = getCount('payment_pending')
  const docsPending = docStatusRows.find(r => r.verification_status === 'pending')?.count ?? 0

  // Fill in gap days so the trend chart doesn't show a broken line for days with zero submissions
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
      color: 'border-l-[#0c2847] text-[#0c2847]',
      href: '/admin/applications',
      hint: 'All submitted stall applications'
    },
    {
      label: 'Under Review',
      value: underReview,
      icon: ClockIcon,
      color: 'border-l-blue-500 text-blue-600',
      href: '/admin/applications?status=under_review',
      hint: 'Awaiting document verification / decision'
    },
    {
      label: 'Selected / Allotted',
      value: selected,
      icon: CheckCircle2Icon,
      color: 'border-l-purple-500 text-purple-600',
      href: '/admin/applications?status=selected',
      hint: 'Approved for allotment'
    },
    {
      label: 'Rejected',
      value: rejected,
      icon: XCircleIcon,
      color: 'border-l-red-500 text-red-600',
      href: '/admin/applications?status=rejected',
      hint: 'Not eligible / failed verification'
    },
    {
      label: 'Payment Pending',
      value: paymentPending,
      icon: ClockIcon,
      color: 'border-l-amber-500 text-amber-600',
      href: '/admin/applications?status=payment_pending',
      hint: 'Registration fee not yet confirmed'
    },
    {
      label: 'Documents Pending',
      value: docsPending,
      icon: FileCheck2Icon,
      color: 'border-l-amber-500 text-amber-600',
      href: '/admin/documents',
      hint: 'Uploaded documents awaiting review'
    }
  ]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Dashboard</h1>
        <p className='text-sm text-muted-foreground'>
          Welcome back, {session?.fullName} · {session?.role.name}
        </p>
      </div>

      {/* KPI strip */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6'>
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.href}>
            <Card className={`h-full border-l-4 shadow-xs transition hover:shadow-sm ${kpi.color}`}>
              <CardHeader className='pb-1'>
                <div className='flex items-center justify-between'>
                  <CardDescription className='text-[10px] font-bold uppercase leading-tight'>
                    {kpi.label}
                  </CardDescription>
                  <kpi.icon className='size-4 opacity-70' />
                </div>
                <CardTitle className='text-2xl font-extrabold'>{kpi.value}</CardTitle>
              </CardHeader>
              <CardContent className='pb-4'>
                <p className='text-[11px] text-muted-foreground'>{kpi.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
        {/* Left: charts */}
        <div className='flex flex-col gap-4 lg:col-span-2'>
          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base font-bold text-[#0c2847]'>
                Submissions — Last {TREND_DAYS} Days
              </CardTitle>
              <CardDescription className='text-xs'>Applications submitted per day</CardDescription>
            </CardHeader>
            <CardContent>
              <SubmissionsTrendChart data={trendData} />
            </CardContent>
          </Card>

          <Card className='shadow-xs'>
            <CardHeader>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Applications by Category</CardTitle>
              <CardDescription className='text-xs'>Across all commercial stall categories</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryRows.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>No submissions yet.</p>
              ) : (
                <CategoryBreakdownChart data={categoryRows} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: recent activity + quick links */}
        <div className='flex flex-col gap-4'>
          <Card className='shadow-xs'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='text-base font-bold text-[#0c2847]'>Recent Activity</CardTitle>
              {permissions?.has('audit:view') && (
                <Link
                  href='/admin/audit-logs'
                  className='inline-flex items-center gap-1 text-xs font-semibold text-[#0c2847] hover:underline'
                >
                  View all <ArrowRightIcon className='size-3' />
                </Link>
              )}
            </CardHeader>
            <CardContent className='space-y-3'>
              {recentAudit.length === 0 ? (
                <p className='py-6 text-center text-sm text-muted-foreground'>No activity yet.</p>
              ) : (
                recentAudit.map(entry => (
                  <div key={entry.id} className='flex items-start gap-2.5'>
                    <ShieldAlertIcon className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
                    <div className='min-w-0'>
                      <p className='truncate font-mono text-xs font-semibold text-[#0c2847]'>{entry.action}</p>
                      <p className='text-[11px] text-muted-foreground'>
                        {entry.actor_name ?? 'System'} ·{' '}
                        {new Date(entry.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className='border-dashed shadow-none'>
            <CardHeader>
              <CardTitle className='text-sm font-bold text-muted-foreground'>Not shown yet</CardTitle>
              <CardDescription className='text-xs'>
                Payment collection, inventory, draw, and allotment KPIs will appear once those modules are built —
                see <code className='rounded bg-muted px-1 py-0.5'>/admin/payments</code>,{' '}
                <code className='rounded bg-muted px-1 py-0.5'>/admin/inventory</code>, and{' '}
                <code className='rounded bg-muted px-1 py-0.5'>/admin/draw</code>.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
