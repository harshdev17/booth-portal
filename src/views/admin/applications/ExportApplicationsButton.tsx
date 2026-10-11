'use client'

import { useSearchParams } from 'next/navigation'
import { DownloadIcon, ChevronDownIcon, FileSpreadsheetIcon, DatabaseIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface ExportApplicationsButtonProps {
  totalFiltered?: number
  totalAll?: number
}

export default function ExportApplicationsButton({
  totalFiltered,
  totalAll
}: ExportApplicationsButtonProps) {
  const searchParams = useSearchParams()

  const q = searchParams.get('q')
  const status = searchParams.get('status')
  const category = searchParams.get('category')

  const hasActiveFilters = Boolean(
    q || (status && status !== 'all') || (category && category !== 'all')
  )

  const filteredParams = new URLSearchParams()
  if (q) filteredParams.set('q', q)
  if (status) filteredParams.set('status', status)
  if (category) filteredParams.set('category', category)

  const filteredExportUrl = `/api/admin/applications/export?${filteredParams.toString()}`
  const allExportUrl = '/api/admin/applications/export?all=true'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            className='bg-white text-slate-700 hover:text-[#0c2847] hover:bg-slate-50 border-slate-300 font-semibold shadow-xs flex items-center gap-1.5'
          />
        }
      >
        <DownloadIcon className='size-4 text-[#0c2847]' />
        <span>Export to CSV</span>
        <ChevronDownIcon className='size-3.5 opacity-60 ml-0.5' />
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuLabel className='text-xs font-semibold text-slate-500'>
          Export Applications Data
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {hasActiveFilters && (
          <DropdownMenuItem
            render={
              <a
                href={filteredExportUrl}
                download
                className='flex items-start gap-2.5 py-2 cursor-pointer'
              />
            }
          >
            <FileSpreadsheetIcon className='size-4 text-blue-600 mt-0.5 shrink-0' />
            <div>
              <div className='font-semibold text-slate-800 text-xs'>
                Export Current Filtered View
              </div>
              <div className='text-[11px] text-slate-500'>
                {totalFiltered !== undefined ? `${totalFiltered} records` : 'Matching active filters'}
              </div>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          render={
            <a
              href={allExportUrl}
              download
              className='flex items-start gap-2.5 py-2 cursor-pointer'
            />
          }
        >
          <DatabaseIcon className='size-4 text-emerald-600 mt-0.5 shrink-0' />
          <div>
            <div className='font-semibold text-slate-800 text-xs'>
              Export All Applications (Complete Data)
            </div>
            <div className='text-[11px] text-slate-500'>
              {totalAll !== undefined ? `All ${totalAll} submitted records` : 'Every application & stall detail'}
            </div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
