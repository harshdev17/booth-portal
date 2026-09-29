'use client'

import { useRouter } from 'next/navigation'

import { PAGE_SIZE_OPTIONS } from '@/lib/pagination'

type Props = {
  value: number | 'all'
  buildUrl: (size: number | 'all') => string
}

/**
 * Small client island for the "rows per page" selector inside the otherwise
 * server-rendered TablePagination — navigation on change needs JS, nothing
 * else on these list pages does.
 */
const PageSizeSelect = ({ value, buildUrl }: Props) => {
  const router = useRouter()

  return (
    <label className='flex items-center gap-1.5 text-xs text-muted-foreground'>
      Rows:
      <select
        value={String(value)}
        onChange={event => {
          const raw = event.target.value

          router.push(buildUrl(raw === 'all' ? 'all' : Number(raw)))
        }}
        className='h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-slate-700'
      >
        {PAGE_SIZE_OPTIONS.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value='all'>All</option>
      </select>
    </label>
  )
}

export default PageSizeSelect
