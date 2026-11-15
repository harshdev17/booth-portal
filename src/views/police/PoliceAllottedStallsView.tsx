import Link from 'next/link'
import {
  ShieldCheckIcon,
  StoreIcon,
  CheckCircle2Icon,
  EyeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingIcon
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import KpiCard from '@/components/shared/KpiCard'
import TablePagination from '@/components/shared/TablePagination'
import { encodeId } from '@/lib/security/opaque-id'
import PoliceFilterBar from '@/views/police/PoliceFilterBar'

export type PoliceAllottedItem = {
  id: number
  application_number: string
  representative_name: string
  organisation_name: string
  father_name: string
  police_station_name: string
  police_station_address?: string | null
  address?: string | null
  state: string
  district: string
  pin_code?: string | null
  mobile_number: string
  alternate_mobile?: string | null
  aadhaar_last4: string
  status: string
  category_name: string
  category_slug: string
  is_direct_allotment?: boolean | number
  stall_number: string | null
  shop_type: string | null
  direction: string | null
  submitted_at: string | null
  work_purpose?: string | null
  doc_count: number
}

type Props = {
  allottedApps: PoliceAllottedItem[]
  total: number
  categoryList: Array<{ id: number; name: string; slug: string; is_direct_allotment?: number | boolean }>
  totalAllottedCount: number
  totalUnitsCount: number
  page: number
  pageSize: number | 'all'
  buildPageUrl: (targetPage: number) => string
  buildPageSizeUrl: (targetSize: number | 'all') => string
  viewMode?: 'police' | 'admin'
}

export default function PoliceAllottedStallsView({
  allottedApps,
  total,
  categoryList,
  totalAllottedCount,
  totalUnitsCount,
  page,
  pageSize,
  buildPageUrl,
  buildPageSizeUrl,
  viewMode = 'admin'
}: Props) {
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-6'>
      {/* Top Header matching Admin Design System */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Police &amp; Security Verification</h1>
          <p className='text-sm text-muted-foreground'>
            Official on-ground directory of all allotted stalls (Commercial, Custom / Direct Allotment &amp; General Categories) with candidate identity, address, police station, and verification details.
          </p>
        </div>
      </div>

      {/* KPI Cards matching Admin Theme */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <KpiCard
          label='Allotted Booths / Stalls'
          value={totalUnitsCount}
          icon={StoreIcon}
          accentColor='text-[#0c2847]'
          hint='Booths/Stalls officially allotted'
        />
        <KpiCard
          label='Allotted Candidates / Vendors'
          value={totalAllottedCount}
          icon={ShieldCheckIcon}
          accentColor='text-emerald-600'
          hint='Approved candidates allotted a stall'
        />
        <KpiCard
          label='Total Allotted Categories'
          value={categoryList.length}
          icon={CheckCircle2Icon}
          accentColor='text-purple-600'
          hint='Commercial &amp; Custom Categories'
        />
      </div>

      {/* Filter and Search Bar */}
      <PoliceFilterBar categories={categoryList} />

      {/* Main Allotted Applications Table */}
      <Card className='overflow-hidden shadow-xs'>
        <CardHeader className='border-b py-4 px-6 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-base font-semibold text-[#0c2847]'>
              Allotted Stalls &amp; Candidate Particulars ({total})
            </CardTitle>
            <CardDescription className='text-xs text-muted-foreground'>
              All stalls with completed allotment (Commercial &amp; Custom/Direct Allotments) are displayed. Payment details are excluded for police security verification.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            {allottedApps.length === 0 ? (
              <div className='py-16 text-center text-muted-foreground'>
                <ShieldCheckIcon className='size-12 mx-auto text-muted-foreground/40 mb-3' />
                <p className='text-base font-semibold text-[#0c2847]'>No allotted stalls found.</p>
                <p className='text-xs text-muted-foreground mt-1 max-w-sm mx-auto'>
                  Once booths/stalls are allotted to applicants, they will appear in this verification list.
                </p>
              </div>
            ) : (
              <table className='w-full table-auto border-separate border-spacing-0 text-left text-sm'>
                <thead className='border-b bg-muted/40 text-xs font-bold text-muted-foreground uppercase'>
                  <tr>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>Booth / Stall</th>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>App Number</th>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>Allottee / Representative</th>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>Category</th>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>Address &amp; Police Station</th>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>Contact</th>
                    <th className='py-3 px-4 whitespace-nowrap border-b border-slate-200'>Status</th>
                    <th className='py-3 px-4 text-right whitespace-nowrap border-b border-slate-200'>Action</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {allottedApps.map(item => {
                    const encodedId = encodeId(item.id)

                    return (
                      <tr key={item.id} className='hover:bg-muted/30 transition'>
                        {/* Stall Number */}
                        <td className='py-3 px-4 whitespace-nowrap'>
                          <p className='font-mono font-bold text-[#0c2847] text-sm'>Stall #{item.stall_number}</p>
                          {(item.direction || item.shop_type) && (
                            <p className='text-[11px] font-sans font-normal text-muted-foreground capitalize mt-0.5'>
                              {[item.direction ? `${item.direction} Facing` : null, item.shop_type ? item.shop_type : null].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>

                        {/* Application Number */}
                        <td className='py-3.5 px-4 font-mono text-xs font-bold text-[#0c2847] whitespace-nowrap'>
                          {item.id > 0 ? (
                            <Link
                              href={viewMode === 'admin' ? `/admin/applications/${encodedId}` : `/police/applications/${encodedId}`}
                              className='hover:underline'
                            >
                              {item.application_number}
                            </Link>
                          ) : (
                            item.application_number
                          )}
                        </td>

                        {/* Allottee & Organisation */}
                        <td className='py-3 px-4'>
                          <p className='font-bold text-[#0c2847] text-sm'>{item.representative_name}</p>
                          {item.organisation_name && item.organisation_name !== '—' && (
                            <p className='text-xs text-muted-foreground truncate max-w-[220px]'>{item.organisation_name}</p>
                          )}
                          <p className='text-xs text-slate-500 mt-0.5'>S/O: {item.father_name}</p>
                        </td>

                        {/* Category */}
                        <td className='py-3 px-4 whitespace-nowrap'>
                          <span className='inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800'>
                            {item.category_name}
                          </span>
                          {Boolean(item.is_direct_allotment) && (
                            <span className='block text-[10px] font-semibold text-purple-700 mt-0.5'>Direct Allotment</span>
                          )}
                        </td>

                        {/* Address & Police Station */}
                        <td className='py-3 px-4 text-xs'>
                          <p className='font-semibold text-slate-800'>{item.district}, {item.state}{item.pin_code ? ` - ${item.pin_code}` : ''}</p>
                          {item.address && (
                            <p className='text-muted-foreground truncate max-w-[220px] text-[11px] mt-0.5' title={item.address}>
                              {item.address}
                            </p>
                          )}
                          <p className='font-semibold text-blue-900 mt-0.5 text-[11px]'>
                            PS: {item.police_station_name}
                          </p>
                        </td>

                        {/* Contact Details */}
                        <td className='py-3 px-4 font-mono text-xs text-slate-800 whitespace-nowrap'>
                          <p className='font-medium text-slate-800'>+91 {item.mobile_number}</p>
                          {item.alternate_mobile && (
                            <p className='text-[11px] text-muted-foreground'>Alt: +91 {item.alternate_mobile}</p>
                          )}
                          <p className='text-[11px] font-mono text-slate-500 mt-0.5'>Aadhaar: •••• {item.aadhaar_last4}</p>
                        </td>

                        {/* Identity Status */}
                        <td className='py-3 px-4 whitespace-nowrap'>
                          <span className='inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800'>
                            Allotted
                          </span>
                        </td>

                        {/* Action */}
                        <td className='py-3 px-4 text-right whitespace-nowrap'>
                          {item.id > 0 ? (
                            <Link
                              href={viewMode === 'admin' ? `/admin/applications/${encodedId}` : `/police/applications/${encodedId}`}
                              className='inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0c2847] hover:bg-slate-50 transition shadow-2xs'
                            >
                              <EyeIcon className='size-3.5 text-blue-700' /> Full Dossier
                            </Link>
                          ) : (
                            <span className='text-xs font-medium text-muted-foreground'>Direct Stall</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        buildUrl={buildPageUrl}
        buildPageSizeUrl={buildPageSizeUrl}
      />
    </div>
  )
}
