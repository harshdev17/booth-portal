'use client'

import { useRef, useTransition } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Loader2Icon, SearchIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'

const SEARCH_DEBOUNCE_MS = 400

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Applications' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'query_raised', label: 'Query Raised' },
  { value: 'selected', label: 'Approved / Allotted' },
  { value: 'rejected', label: 'Rejected' }
]

/**
 * Search box and category/status selects apply on their own — no "Filter"
 * button to click (reported live: the extra click was pure friction). The
 * search box debounces so typing doesn't fire a navigation per keystroke;
 * both selects navigate immediately on change, matching the Quick Filter
 * chips below them (plain links — already apply on a single click). Sort,
 * direction and page size are read straight from the current URL and
 * carried over untouched; any filter change here also drops `page` back to
 * the first page, since the result set just changed.
 *
 * The search input is uncontrolled, keyed on the URL's current `q` — this
 * project's lint config (React Compiler rules) disallows both syncing local
 * state from a useEffect and reading/writing refs during render, which
 * rules out the usual "controlled input + reset on external change"
 * patterns. Keying on `q` remounts (and so resets) the box only when it
 * actually changes externally — a quick filter chip, Clear, or browser
 * back/forward — not on every debounced navigation this box causes itself.
 */
const ApplicationsFilterBar = ({ categories }: { categories: Array<{ slug: string; name: string }> }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQ = searchParams.get('q') ?? ''

  const navigate = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }

    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  const onSearchChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate({ q: value }), SEARCH_DEBOUNCE_MS)
  }

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    navigate({ q: e.currentTarget.value })
  }

  const hasFilters = !!(searchParams.get('q') || searchParams.get('status') || searchParams.get('category'))

  return (
    <div className='flex flex-col gap-3 sm:flex-row'>
      <div className='relative flex-1'>
        <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
        <Input
          key={currentQ}
          defaultValue={currentQ}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder='Search by Application Number, Name, Firm, Mobile or Email...'
          className='pl-9 pr-9'
        />
        {isPending && <Loader2Icon className='absolute right-3 top-3 size-4 animate-spin text-muted-foreground' />}
      </div>

      <select
        value={searchParams.get('category') ?? 'all'}
        onChange={e => navigate({ category: e.target.value === 'all' ? null : e.target.value })}
        className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background'
      >
        <option value='all'>All Categories</option>
        {categories.map(c => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get('status') ?? ''}
        onChange={e => navigate({ status: e.target.value || null })}
        className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background'
      >
        {STATUS_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type='button'
          onClick={() => navigate({ q: null, status: null, category: null })}
          className='inline-flex items-center justify-center rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted transition'
        >
          Clear
        </button>
      )}
    </div>
  )
}

export default ApplicationsFilterBar
