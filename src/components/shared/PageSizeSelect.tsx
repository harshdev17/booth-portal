'use client'

import { useRouter } from 'next/navigation'

type Props = {
  value: number | 'all'

  /**
   * Pre-built href for each selectable page size, computed server-side by
   * TablePagination (which already has the current search params) — plain
   * data, not a function, since a Server Component's closures cannot be
   * passed as props into a Client Component (React throws "Functions cannot
   * be passed directly to Client Components" if attempted; see
   * .ai/CHANGELOG.md for the incident this fixes).
   */
  options: Array<{ value: number | 'all'; href: string }>
}

/**
 * Small client island for the "rows per page" selector inside the otherwise
 * server-rendered TablePagination — navigation on change needs JS, nothing
 * else on these list pages does.
 */
const PageSizeSelect = ({ value, options }: Props) => {
  const router = useRouter()

  return (
    <label className='flex items-center gap-1.5 text-xs text-muted-foreground'>
      Rows:
      <select
        value={String(value)}
        onChange={event => {
          const raw = event.target.value
          const targetValue = raw === 'all' ? 'all' : Number(raw)
          const match = options.find(option => option.value === targetValue)

          if (match) router.push(match.href)
        }}
        className='h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-slate-700'
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.value === 'all' ? 'All' : option.value}
          </option>
        ))}
      </select>
    </label>
  )
}

export default PageSizeSelect
