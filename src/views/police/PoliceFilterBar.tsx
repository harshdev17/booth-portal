'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PoliceFilterBar({
  categories
}: {
  categories: Array<{ id: number; name: string; slug: string }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentQ = searchParams.get('q') ?? ''
  const currentCategory = searchParams.get('category') ?? ''

  function updateSearch(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    router.push(pathname)
  }

  return (
    <div className='flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs'>
      <div className='flex flex-1 flex-col sm:flex-row gap-3 w-full sm:w-auto'>
        <div className='relative flex-1'>
          <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400' />
          <Input
            placeholder='Search Allottee Name, App No, Mobile, Booth/Stall No...'
            defaultValue={currentQ}
            onChange={e => updateSearch('q', e.target.value)}
            className='pl-9 h-10 border-slate-300 text-sm focus:border-blue-600'
          />
        </div>

        <select
          value={currentCategory}
          onChange={e => updateSearch('category', e.target.value)}
          aria-label='Filter by Category'
          className='h-10 px-3 text-sm rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
        >
          <option value=''>All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {(currentQ || currentCategory) && (
        <Button
          variant='ghost'
          size='sm'
          onClick={clearAll}
          className='text-slate-500 hover:text-slate-900 text-xs flex items-center gap-1.5'
        >
          <XIcon className='size-3.5' /> Clear Filters
        </Button>
      )}
    </div>
  )
}
