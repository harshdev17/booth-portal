'use client'

import { useState } from 'react'

import { useSearchParams } from 'next/navigation'
import { DownloadIcon, ChevronDownIcon, FileSpreadsheetIcon, DatabaseIcon, Loader2Icon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  const [downloading, setDownloading] = useState<'filtered' | 'all' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const q = searchParams.get('q')
  const status = searchParams.get('status')
  const category = searchParams.get('category')

  const hasActiveFilters = Boolean(
    q || (status && status !== 'all') || (category && category !== 'all')
  )

  // "Export All" ignores every filter (no category, no status, no search —
  // see allExportUrl below), so its count/label would be actively
  // misleading once a category is selected: it previously showed the
  // CATEGORY's total (totalAll was built from a category-scoped query, see
  // page.tsx) right next to a button that actually exports every category —
  // reported live as confusing ("dono mai data hi same aaye ga to iska
  // matlab kya hai"). Per explicit request, the simplest fix is to not
  // offer "Export All" at all while a category is selected — only the
  // category-scoped "Current Filtered View" export makes sense in that
  // state.
  const hasCategoryFilter = Boolean(category && category !== 'all')

  const filteredParams = new URLSearchParams()
  if (q) filteredParams.set('q', q)
  if (status) filteredParams.set('status', status)
  if (category) filteredParams.set('category', category)

  const filteredExportUrl = `/api/admin/applications/export?${filteredParams.toString()}`
  const allExportUrl = '/api/admin/applications/export?all=true'

  /**
   * A plain `<a href download>` gives no feedback while the server builds
   * the CSV (a multi-second wait for a few thousand rows) — the button just
   * sits there with nothing visibly happening, reported live as "export
   * click karta hoon to time leta hai aur koi loader nahi aata." Fetching
   * the CSV as a blob lets this show a spinner for that wait, then trigger
   * the save via a short-lived object URL instead of a real link.
   */
  const handleExport = async (url: string, which: 'filtered' | 'all') => {
    setDownloading(which)
    setError(null)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        setError('Export failed. Please try again.')

        return
      }

      const disposition = response.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="([^"]+)"/)
      const filename = filenameMatch ? filenameMatch[1] : 'applications-export.csv'

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

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
        {downloading ? (
          <Loader2Icon className='size-4 text-[#0c2847] animate-spin' />
        ) : (
          <DownloadIcon className='size-4 text-[#0c2847]' />
        )}
        <span>{downloading ? 'Preparing export…' : 'Export to CSV'}</span>
        <ChevronDownIcon className='size-3.5 opacity-60 ml-0.5' />
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='text-xs font-semibold text-slate-500'>
            Export Applications Data
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {error && (
            <div className='px-2 py-1.5 text-[11px] font-medium text-red-600'>{error}</div>
          )}

          {hasActiveFilters && (
            <DropdownMenuItem
              disabled={downloading !== null}
              onClick={() => void handleExport(filteredExportUrl, 'filtered')}
              className='flex items-start gap-2.5 py-2 cursor-pointer'
            >
              {downloading === 'filtered' ? (
                <Loader2Icon className='size-4 text-blue-600 mt-0.5 shrink-0 animate-spin' />
              ) : (
                <FileSpreadsheetIcon className='size-4 text-blue-600 mt-0.5 shrink-0' />
              )}
              <div>
                <div className='font-semibold text-slate-800 text-xs'>
                  Export Current Filtered View
                </div>
                <div className='text-[11px] text-slate-500'>
                  {downloading === 'filtered'
                    ? 'Preparing file…'
                    : totalFiltered !== undefined
                      ? `${totalFiltered} records`
                      : 'Matching active filters'}
                </div>
              </div>
            </DropdownMenuItem>
          )}

          {!hasCategoryFilter && (
            <DropdownMenuItem
              disabled={downloading !== null}
              onClick={() => void handleExport(allExportUrl, 'all')}
              className='flex items-start gap-2.5 py-2 cursor-pointer'
            >
              {downloading === 'all' ? (
                <Loader2Icon className='size-4 text-emerald-600 mt-0.5 shrink-0 animate-spin' />
              ) : (
                <DatabaseIcon className='size-4 text-emerald-600 mt-0.5 shrink-0' />
              )}
              <div>
                <div className='font-semibold text-slate-800 text-xs'>
                  Export All Applications (Complete Data)
                </div>
                <div className='text-[11px] text-slate-500'>
                  {downloading === 'all'
                    ? 'Preparing file…'
                    : totalAll !== undefined
                      ? `All ${totalAll} submitted records`
                      : 'Every application & booth/stall detail'}
                </div>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
