'use client'

import { useEffect, useRef, useState } from 'react'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Input } from '@/components/ui/input'

/**
 * Status/Channel/Category apply instantly on change; the search box applies
 * on a short debounce while typing — no separate "Filter" button to click,
 * per explicit request. Always resets to page 1 on any filter change, since
 * a new filter's results may not even have that many pages.
 */
const NotificationLogsFilterBar = ({
  initialQ,
  initialStatus,
  initialChannel,
  initialCategory,
  categories
}: {
  initialQ: string
  initialStatus: string
  initialChannel: string
  initialCategory: string
  categories: string[]
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const navigate = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(overrides)) {
      if (!value || value === 'all') sp.delete(key)
      else sp.set(key, value)
    }

    sp.delete('page')
    router.push(`${pathname}?${sp.toString()}`)
  }

  const handleSearchChange = (value: string) => {
    setQ(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate({ q: value }), 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className='flex flex-1 flex-wrap gap-3'>
      <Input
        value={q}
        onChange={e => handleSearchChange(e.target.value)}
        placeholder='Search by mobile, email, application number or name...'
        className='min-w-55 flex-1'
      />
      <select
        defaultValue={initialStatus}
        onChange={e => navigate({ status: e.target.value })}
        className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm'
      >
        <option value='all'>All Statuses</option>
        <option value='sent'>Sent</option>
        <option value='failed'>Failed</option>
      </select>
      <select
        defaultValue={initialChannel}
        onChange={e => navigate({ channel: e.target.value })}
        className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm'
      >
        <option value='all'>All Channels</option>
        <option value='whatsapp'>WhatsApp</option>
        <option value='sms'>SMS</option>
        <option value='email'>Email</option>
      </select>
      <select
        defaultValue={initialCategory}
        onChange={e => navigate({ category: e.target.value })}
        className='h-10 rounded-md border border-input bg-background px-3 py-2 text-sm'
      >
        <option value='all'>All Categories</option>
        {categories.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}

export default NotificationLogsFilterBar
