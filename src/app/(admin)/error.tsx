'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { LockIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Next.js redacts a thrown error's real `message`/`name` by default once
// deployed (only `digest` is guaranteed to reach this client boundary) — so
// AuthenticationError/AuthorizationError (src/lib/rbac/authorize.ts,
// src/lib/auth/session.ts) explicitly re-throw with this prefix on `message`
// before leaving the server, the one property Next does pass through for
// errors rendered by an error boundary (as opposed to logged/discarded
// silently). Anything else reaching here (DB busy, transient connection
// error, a real bug) gets the auto-retrying "server busy" message instead of
// the misleading "you don't have access" one.
const PERMISSION_ERROR_PREFIX = 'PERMISSION_DENIED:'

export default function AdminErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isPermissionError = error.message?.startsWith(PERMISSION_ERROR_PREFIX)
  const [autoRetrySeconds, setAutoRetrySeconds] = useState(3)

  useEffect(() => {
    if (isPermissionError) return

    if (autoRetrySeconds <= 0) {
      reset()

      return
    }

    const timer = setTimeout(() => setAutoRetrySeconds(s => s - 1), 1000)

    return () => clearTimeout(timer)
  }, [isPermissionError, autoRetrySeconds, reset])

  if (isPermissionError) {
    return (
      <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center'>
        <div className='flex size-14 items-center justify-center rounded-full bg-amber-100'>
          <LockIcon className='size-7 text-amber-700' />
        </div>
        <div>
          <h1 className='text-lg font-bold text-[#0c2847]'>You don&apos;t have access to this page</h1>
          <p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>
            Your account doesn&apos;t have permission for this section. If you believe this is a mistake, contact
            your Super Admin to review your access.
          </p>
        </div>
        <div className='mt-2 flex items-center gap-2'>
          <Button type='button' variant='outline' onClick={() => reset()}>
            <RefreshCwIcon className='size-4' />
            Try Again
          </Button>
          <Button
            type='button'
            render={<Link href='/admin/dashboard' />}
            className='bg-[#0c2847] hover:bg-[#12365c] text-white'
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center'>
      <div className='flex size-14 items-center justify-center rounded-full bg-slate-100'>
        <RefreshCwIcon className='size-7 animate-spin text-slate-600' />
      </div>
      <div>
        <h1 className='text-lg font-bold text-[#0c2847]'>Server Busy — Reconnecting</h1>
        <p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>
          The server is briefly busy. This page will reload automatically in {autoRetrySeconds}s.
        </p>
      </div>
      <Button type='button' variant='outline' onClick={() => reset()}>
        <RefreshCwIcon className='size-4' />
        Retry Now
      </Button>
    </div>
  )
}
