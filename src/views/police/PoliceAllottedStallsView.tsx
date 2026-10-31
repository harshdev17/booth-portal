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
              <table className='w-full text-left text-sm'>
                <thead className='border-b bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider'>
                  <tr>
                    <th className='py-3.5 px-4'>Booth/Stall</th>
                    <th className='py-3.5 px-4'>App Number</th>
                    <th className='py-3.5 px-4'>Allottee / Representative</th>
                    <th className='py-3.5 px-4'>Category</th>
                    <th className='py-3.5 px-4'>Address &amp; Police Station</th>
                    <th className='py-3.5 px-4'>Contact Details</th>
                    <th className='py-3.5 px-4'>Identity Status</th>
                    <th className='py-3.5 px-4 text-right'>Action</th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {allottedApps.map(item => {
                    const encodedId = encodeId(item.id)

                    return (
                      <tr key={item.id} className='hover:bg-muted/30 transition group'>
                        {/* Stall Number */}
                        <td className='py-3.5 px-4 font-mono font-bold text-sm text-[#0c2847]'>
                          <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-[#0c2847] border border-blue-200 text-xs font-bold'>
                            <StoreIcon className='size-3.5 text-blue-700' />
                            <span>Stall #{item.stall_number}</span>
                          </div>
                          {item.direction && (
                            <span className='block text-[11px] text-muted-foreground font-sans mt-0.5'>
                              Facing: {item.direction}
                            </span>
                          )}
                          {item.shop_type && (
                            <span className='block text-[10px] text-muted-foreground font-sans'>
                              Type: {item.shop_type}
                            </span>
                          )}
                        </td>

                        {/* Application Number */}
                        <td className='py-3.5 px-4 font-mono text-xs font-bold text-[#0c2847]'>
                          {item.application_number}
                        </td>

                        {/* Allottee & Organisation */}
                        <td className='py-3.5 px-4'>
                          <div className='font-bold text-[#0c2847] text-sm'>
                            {item.representative_name}
                          </div>
                          {item.organisation_name && item.organisation_name !== '—' && (
                            <div className='flex items-center gap-1 text-xs text-muted-foreground font-medium mt-0.5'>
                              <BuildingIcon className='size-3 text-muted-foreground shrink-0' />
                              <span>{item.organisation_name}</span>
                            </div>
                          )}
                          <p className='text-xs text-muted-foreground mt-0.5'>S/O, D/O: {item.father_name}</p>
                          {item.work_purpose && (
                            <p className='text-[11px] text-muted-foreground line-clamp-1 italic max-w-xs mt-0.5' title={item.work_purpose}>
                              Craft: {item.work_purpose}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className='py-3.5 px-4'>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            <span className='inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800'>
                              {item.category_name}
                            </span>
                            {Boolean(item.is_direct_allotment) ? (
                              <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200'>
                                Custom / Direct
                              </span>
                            ) : (
                              <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200'>
                                Commercial
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Address & Police Station */}
                        <td className='py-3.5 px-4 text-xs text-slate-700'>
                          <div className='flex items-start gap-1'>
                            <MapPinIcon className='size-3.5 text-muted-foreground shrink-0 mt-0.5' />
                            <div>
                              <span className='font-semibold text-[#0c2847] block'>
                                {item.district}, {item.state} {item.pin_code ? `- ${item.pin_code}` : ''}
                              </span>
                              {item.address && (
                                <p className='text-[11px] text-muted-foreground line-clamp-1 max-w-xs mt-0.5' title={item.address}>
                                  {item.address}
                                </p>
                              )}
                              <p className='text-[11px] text-blue-900 font-semibold mt-1'>
                                PS: {item.police_station_name}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className='py-3.5 px-4 font-mono text-xs text-slate-800'>
                          <div className='flex items-center gap-1.5'>
                            <PhoneIcon className='size-3 text-muted-foreground' />
                            <span className='font-medium'>+91 {item.mobile_number}</span>
                          </div>
                          {item.alternate_mobile && (
                            <div className='flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5'>
                              <span>Alt: +91 {item.alternate_mobile}</span>
                            </div>
                          )}
                        </td>

                        {/* Identity Status */}
                        <td className='py-3.5 px-4'>
                          <div className='flex flex-col gap-1'>
                            <span className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 w-fit'>
                              <CheckCircle2Icon className='size-3 text-emerald-600' />
                              Allotted
                            </span>
                            <span className='text-[10px] font-mono text-muted-foreground'>
                              Aadhaar: •••• {item.aadhaar_last4}
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className='py-3.5 px-4 text-right'>
                          {item.id > 0 ? (
                            <Link href={viewMode === 'admin' ? `/admin/applications/${encodedId}` : `/police/applications/${encodedId}`}>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-8 text-xs font-semibold text-[#0c2847] hover:bg-slate-50 flex items-center gap-1.5 ml-auto'
                              >
                                <EyeIcon className='size-3.5' /> Full Dossier
                              </Button>
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
