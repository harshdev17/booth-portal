'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { FileTextIcon } from 'lucide-react'

import StickyHorizontalTableScroll from '@/components/shared/StickyHorizontalTableScroll'
import ApplicationRowActions from '@/views/admin/applications/ApplicationRowActions'
import ApplicationsBulkActionsBar from '@/views/admin/applications/ApplicationsBulkActionsBar'

type StatusConfig = { label: string; color: string }

export type ApplicationTableRow = {
  id: number
  encodedId: string
  application_number: string
  category_name: string
  organisation_name: string
  representative_name: string
  mobile_number: string
  email: string
  status: string
  open_queries: number
  reuploaded_pending: number
  submitted_at: string | null
  created_at: string
  stall_number: string | null
  draw_allocation_type: 'allotted' | 'waitlist' | null
  waitlist_position: number | null
  allotted_at: string | null
  allotment_payment_status: string
  allotment_payment_amount_paise: number | null
  registration_payment_status: string | null
  is_direct_allotment: number | boolean
  canApprove: boolean
  canReject: boolean
  statusCfg: StatusConfig
  isPaymentPending: boolean
}

type SortIcon = 'asc' | 'desc' | 'none'

type Props = {
  applications: ApplicationTableRow[]
  sortLinks: {
    appNo: string
    name: string
    category: string
    status: string
    date: string
  }
  sortIcons: {
    appNo: SortIcon
    name: SortIcon
    category: SortIcon
    status: SortIcon
    date: SortIcon
  }
}

function SortIndicator({ icon }: { icon: SortIcon }) {
  if (icon === 'none') return <span className='ml-1 opacity-30 select-none text-[11px]'>↕</span>
  if (icon === 'asc') return <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↑</span>

  return <span className='ml-1 text-[#0c2847] font-bold select-none text-[11px]'>↓</span>
}

/**
 * Client wrapper around the Applications table, specifically so rows can be
 * checkbox-selected for bulk actions — "Send Payment Reminder", "Approve",
 * and "Reject" (all per explicit request, 2026-11-05) — mirroring the
 * existing single-row reminder button and the single-row
 * ApplicationRowActions approve/reject buttons, applied to many applications
 * in one click. A checkbox only appears on a row eligible for AT LEAST ONE
 * of the three bulk actions (`isPaymentPending || canApprove || canReject`);
 * ApplicationsBulkActionsBar itself only enables each action's button when
 * at least one SELECTED row is eligible for that specific action — the
 * backend routes independently re-check eligibility per row regardless, so
 * this is just to avoid a confusing "enabled but does nothing" button.
 */
export default function ApplicationsTableClient({ applications, sortLinks, sortIcons }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const actionableRows = useMemo(
    () => applications.filter(a => a.isPaymentPending || a.canApprove || a.canReject),
    [applications]
  )
  const allActionableSelected = actionableRows.length > 0 && actionableRows.every(a => selected.has(a.encodedId))

  const toggleOne = (encodedId: string) => {
    setSelected(prev => {
      const next = new Set(prev)

      if (next.has(encodedId)) next.delete(encodedId)
      else next.add(encodedId)

      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev => {
      if (allActionableSelected) return new Set()

      return new Set(actionableRows.map(a => a.encodedId))
    })
  }

  const handleDone = () => {
    setSelected(new Set())
    router.refresh()
  }

  const selectedRows = applications.filter(a => selected.has(a.encodedId))

  if (applications.length === 0) {
    return (
      <div className='py-12 text-center'>
        <FileTextIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
        <p className='text-sm font-semibold text-muted-foreground'>No applications found.</p>
        <p className='text-xs text-muted-foreground/80 mt-1'>
          Try adjusting your search criteria or filter options.
        </p>
      </div>
    )
  }

  return (
    <>
      <ApplicationsBulkActionsBar
        selectedRows={selectedRows.map(r => ({ encodedId: r.encodedId, isPaymentPending: r.isPaymentPending, canApprove: r.canApprove, canReject: r.canReject }))}
        onDone={handleDone}
      />

      <StickyHorizontalTableScroll>
        <table className='min-w-[1600px] w-full text-left text-sm'>
          <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
            <tr>
              <th className='py-3 px-4 w-10'>
                {actionableRows.length > 0 && (
                  <input
                    type='checkbox'
                    checked={allActionableSelected}
                    onChange={toggleAll}
                    aria-label='Select all actionable applications'
                    className='size-4 cursor-pointer accent-[#0c2847]'
                  />
                )}
              </th>
              <th className='py-3 px-4'>
                <Link href={sortLinks.appNo} className='inline-flex items-center hover:text-[#0c2847] transition group'>
                  App Number
                  <SortIndicator icon={sortIcons.appNo} />
                </Link>
              </th>
              <th className='py-3 px-4'>
                <Link href={sortLinks.name} className='inline-flex items-center hover:text-[#0c2847] transition group'>
                  Applicant / Firm
                  <SortIndicator icon={sortIcons.name} />
                </Link>
              </th>
              <th className='py-3 px-4'>
                <Link href={sortLinks.category} className='inline-flex items-center hover:text-[#0c2847] transition group'>
                  Category
                  <SortIndicator icon={sortIcons.category} />
                </Link>
              </th>
              <th className='py-3 px-4'>Contact</th>
              <th className='py-3 px-4'>Booth / Stall</th>
              <th className='py-3 px-4'>
                <Link href={sortLinks.status} className='inline-flex items-center hover:text-[#0c2847] transition group'>
                  Status
                  <SortIndicator icon={sortIcons.status} />
                </Link>
              </th>
              <th className='py-3 px-4'>
                <Link href={sortLinks.date} className='inline-flex items-center hover:text-[#0c2847] transition group'>
                  Submitted At
                  <SortIndicator icon={sortIcons.date} />
                </Link>
              </th>
              <th className='py-3 px-4'>Allotment Payment</th>
              <th className='py-3 px-4'>Created / Allotted</th>
              <th className='py-3 px-4 text-right'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {applications.map(app => (
              <tr key={app.id} className='hover:bg-muted/30 transition'>
                <td className='py-3.5 px-4'>
                  {(app.isPaymentPending || app.canApprove || app.canReject) && (
                    <input
                      type='checkbox'
                      checked={selected.has(app.encodedId)}
                      onChange={() => toggleOne(app.encodedId)}
                      aria-label={`Select application ${app.application_number}`}
                      className='size-4 cursor-pointer accent-[#0c2847]'
                    />
                  )}
                </td>
                <td className='py-3.5 px-4 font-mono font-bold text-[#0c2847]'>
                  <Link href={`/admin/applications/${app.encodedId}`} className='hover:underline'>
                    {app.application_number}
                  </Link>
                </td>
                <td className='py-3.5 px-4'>
                  <p className='font-bold text-[#0c2847]'>{app.representative_name}</p>
                  <p className='text-xs text-muted-foreground'>{app.organisation_name}</p>
                </td>
                <td className='py-3.5 px-4'>
                  <span className='inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800'>
                    {app.category_name}
                  </span>
                </td>
                <td className='py-3.5 px-4 text-xs space-y-0.5'>
                  <p className='font-mono font-medium text-slate-800'>{app.mobile_number}</p>
                  <p className='text-muted-foreground truncate max-w-[160px]'>{app.email}</p>
                </td>
                <td className='py-3.5 px-4 text-xs'>
                  {app.stall_number ? (
                    <p className='font-mono font-bold text-[#0c2847]'>{app.stall_number}</p>
                  ) : app.draw_allocation_type === 'waitlist' ? (
                    <p className='font-semibold text-amber-700'>Waitlist #{app.waitlist_position}</p>
                  ) : (
                    <span className='text-muted-foreground'>Not allotted</span>
                  )}
                </td>
                <td className='py-3.5 px-4'>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${app.statusCfg.color}`}>
                    {app.statusCfg.label}
                  </span>
                  {Number(app.open_queries) > 0 && (
                    <p className='mt-1 text-[11px] font-semibold text-orange-700'>
                      {app.open_queries} document {Number(app.open_queries) === 1 ? 'query' : 'queries'} open
                    </p>
                  )}
                  {Number(app.reuploaded_pending) > 0 && (
                    <p className='mt-1 text-[11px] font-semibold text-emerald-700'>Re-uploaded · needs review</p>
                  )}
                  {app.draw_allocation_type === 'waitlist' && (
                    <p className='mt-1 text-[11px] font-semibold text-amber-700'>Waitlist #{app.waitlist_position}</p>
                  )}
                </td>
                <td className='py-3.5 px-4 text-xs text-muted-foreground'>
                  {app.submitted_at
                    ? new Date(app.submitted_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : new Date(app.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className='py-3.5 px-4 text-xs'>
                  <p className='font-semibold text-slate-800'>
                    {app.allotment_payment_amount_paise === null
                      ? 'Amount not set'
                      : `₹${(Number(app.allotment_payment_amount_paise) / 100).toLocaleString('en-IN')}`}
                  </p>
                  <p className='text-muted-foreground'>
                    {app.allotment_payment_status === 'not_activated'
                      ? 'Not activated'
                      : app.allotment_payment_status.replaceAll('_', ' ')}
                  </p>
                </td>
                <td className='py-3.5 px-4 text-xs text-muted-foreground'>
                  <p>
                    Created:{' '}
                    {new Date(app.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  <p className='mt-1'>
                    Allotted:{' '}
                    {app.allotted_at
                      ? new Date(app.allotted_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </p>
                </td>
                <td className='py-3.5 px-4'>
                  <div className='flex justify-end'>
                    <ApplicationRowActions applicationId={app.encodedId} canApprove={app.canApprove} canReject={app.canReject} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StickyHorizontalTableScroll>
    </>
  )
}
