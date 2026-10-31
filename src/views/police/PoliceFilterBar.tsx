'use client'

import { useRef, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Loader2Icon, SearchIcon, XIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const SEARCH_DEBOUNCE_MS = 400

export default function PoliceFilterBar({
  categories
}: {
  categories: Array<{ id: number; name: string; slug: string; is_direct_allotment?: number | boolean }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentQ = searchParams.get('q') ?? ''
  const currentCategory = searchParams.get('category') ?? ''

  const navigate = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || value === 'all') params.delete(key)
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

  const hasFilters = Boolean(currentQ || currentCategory)

  return (
    <div className='flex flex-col gap-3 sm:flex-row'>
      <div className='relative flex-1'>
        <SearchIcon className='absolute left-3 top-3 size-4 text-muted-foreground' />
        <Input
          key={currentQ}
          defaultValue={currentQ}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder='Search by Allottee Name, App Number, Mobile, Booth/Stall No, Police Station...'
          className='pl-9 pr-9'
        />
        {isPending && <Loader2Icon className='absolute right-3 top-3 size-4 animate-spin text-muted-foreground' />}
      </div>

      <select
        value={currentCategory || 'all'}
        onChange={e => navigate({ category: e.target.value === 'all' ? null : e.target.value })}
        aria-label='Filter by Category'
        className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background'
      >
        <option value='all'>All Categories (Commercial &amp; Custom)</option>
        {categories.map(c => (
          <option key={c.id} value={c.slug}>
            {c.name} {c.is_direct_allotment ? ' • [Custom / Direct]' : ''}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            startTransition(() => router.push(pathname))
          }}
          className='text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 h-10 px-3'
        >
          <XIcon className='size-3.5' /> Clear Filters
        </Button>
      )}
    </div>
  )
}
