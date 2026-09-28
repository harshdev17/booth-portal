import type { Metadata } from 'next'

import Link from 'next/link'

import { SearchIcon, UsersIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getApplicationStatusConfig } from '@/lib/applications/status-config'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Applicant / User Details — KDB Admin Portal'
}

type ApplicantRow = {
  mobile_number: string
  representative_name: string
  email: string
  organisation_name: string
  application_count: number
  application_ids: string
  statuses: string
  last_activity: string
}

/**
 * Applicant/User Details per .ai/ADMIN_PANEL.md Section 5 — grouped by
 * mobile number, since applications don't yet carry a separate applicant/user
 * account entity (whether one applicant may hold multiple applications is
 * [TBC – Business Confirmation Required], see .ai/BUSINESS_RULES.md #13).
 * Each row links into the existing Application detail page's tabs, which
 * already cover Personal / Application / Documents / Selection / Audit.
 */
const ApplicantsAdminPage = async ({ searchParams }: { searchParams: Promise<{ q?: string }> }) => {
  await requirePermission('application:view')

  const { q } = await searchParams

  const conditions = [`a.status != 'draft'`]
  const params: unknown[] = []

  if (q && q.trim()) {
    conditions.push(`(a.representative_name LIKE ? OR a.mobile_number LIKE ? OR a.email LIKE ? OR a.organisation_name LIKE ?)`)
    const pattern = `%${q.trim()}%`

    params.push(pattern, pattern, pattern, pattern)
  }

  const applicants = await query<ApplicantRow[]>(
    `SELECT a.mobile_number,
            MAX(a.representative_name) AS representative_name,
            MAX(a.email) AS email,
            MAX(a.organisation_name) AS organisation_name,
            COUNT(*) AS application_count,
            GROUP_CONCAT(a.id ORDER BY a.created_at DESC) AS application_ids,
            GROUP_CONCAT(a.status ORDER BY a.created_at DESC) AS statuses,
            MAX(a.created_at) AS last_activity
     FROM applications a
     WHERE ${conditions.join(' AND ')}
     GROUP BY a.mobile_number
     ORDER BY last_activity DESC
     LIMIT 150`,
    params
  )

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Applicant / User Details</h1>
        <p className='text-sm text-muted-foreground'>
          Applicants grouped by mobile number, with links into their application record(s).
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardContent className='pt-6'>
          <form method='GET' className='relative'>
            <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
            <Input name='q' defaultValue={q} placeholder='Search by name, mobile, email or firm...' className='pl-9' />
          </form>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Applicants</CardTitle>
          <CardDescription className='text-xs'>Showing {applicants.length} applicant(s)</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {applicants.length === 0 ? (
            <div className='py-12 text-center'>
              <UsersIcon className='mx-auto size-10 text-muted-foreground/50 mb-2' />
              <p className='text-sm font-semibold text-muted-foreground'>No applicants found.</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-left text-sm'>
                <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
                  <tr>
                    <th className='py-3 px-4'>Applicant</th>
                    <th className='py-3 px-4'>Contact</th>
                    <th className='py-3 px-4'>Firm / Organisation</th>
                    <th className='py-3 px-4'>Application(s)</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {applicants.map(applicant => {
                    const ids = applicant.application_ids.split(',')
                    const statuses = applicant.statuses.split(',')

                    return (
                      <tr key={applicant.mobile_number} className='hover:bg-muted/30 transition'>
                        <td className='py-3.5 px-4 font-bold text-[#0c2847]'>{applicant.representative_name}</td>
                        <td className='py-3.5 px-4 text-xs space-y-0.5'>
                          <p className='font-mono font-medium text-slate-800'>{applicant.mobile_number}</p>
                          <p className='text-muted-foreground truncate max-w-[180px]'>{applicant.email}</p>
                        </td>
                        <td className='py-3.5 px-4'>{applicant.organisation_name}</td>
                        <td className='py-3.5 px-4'>
                          <div className='flex flex-wrap gap-1.5'>
                            {ids.map((appId, idx) => {
                              const statusCfg = getApplicationStatusConfig(statuses[idx])

                              return (
                                <Link
                                  key={appId}
                                  href={`/admin/applications/${appId}`}
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold hover:opacity-80 transition ${statusCfg.color}`}
                                >
                                  {statusCfg.label}
                                </Link>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ApplicantsAdminPage
