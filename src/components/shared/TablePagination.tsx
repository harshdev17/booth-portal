import Link from 'next/link'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import PageSizeSelect from '@/components/shared/PageSizeSelect'
import { PAGE_SIZE_OPTIONS } from '@/lib/pagination'

type Props = {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number | 'all'
  buildUrl: (page: number) => string
  buildPageSizeUrl?: (size: number | 'all') => string
}

/**
 * Shared server-rendered pager for admin list tables (Applications,
 * Applicants, Documents, Audit Logs). Deliberately plain <Link>s, not a
 * client component — every list page here is already a Server Component
 * reading pagination state from the URL's searchParams, so no client JS is
 * needed to change page. Only the rows-per-page <select> needs a small
 * client island, isolated in PageSizeSelect — which is handed a plain array
 * of pre-built hrefs (computed here, server-side, via buildPageSizeUrl)
 * rather than the buildPageSizeUrl function itself, since a Server
 * Component's function props cannot cross into a Client Component.
 */
const TablePagination = ({ page, totalPages, totalItems, pageSize, buildUrl, buildPageSizeUrl }: Props) => {
  if (totalItems === 0) return null

  const rangeStart = pageSize === 'all' ? 1 : (page - 1) * pageSize + 1
  const rangeEnd = pageSize === 'all' ? totalItems : Math.min(page * pageSize, totalItems)

  const pageSizeOptions = buildPageSizeUrl
    ? [...PAGE_SIZE_OPTIONS.map(size => ({ value: size as number | 'all', href: buildPageSizeUrl(size) })), { value: 'all' as const, href: buildPageSizeUrl('all') }]
    : null

  return (
    <div className='flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm sm:flex-row'>
      <div className='flex items-center gap-4'>
        <p className='text-xs text-muted-foreground'>
          Showing <span className='font-semibold text-slate-700'>{rangeStart}</span>–
          <span className='font-semibold text-slate-700'>{rangeEnd}</span> of{' '}
          <span className='font-semibold text-slate-700'>{totalItems}</span>
        </p>
        {pageSizeOptions && <PageSizeSelect value={pageSize} options={pageSizeOptions} />}
      </div>

      {totalPages > 1 && (
        <div className='flex items-center gap-2'>
          <Link
            href={buildUrl(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition ${
              page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-muted'
            }`}
          >
            <ChevronLeftIcon className='size-3.5' /> Previous
          </Link>
          <span className='px-2 text-xs font-semibold text-muted-foreground'>
            Page {page} of {totalPages}
          </span>
          <Link
            href={buildUrl(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs font-medium transition ${
              page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-muted'
            }`}
          >
            Next <ChevronRightIcon className='size-3.5' />
          </Link>
        </div>
      )}
    </div>
  )
}

export default TablePagination
