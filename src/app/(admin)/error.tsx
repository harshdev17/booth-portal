'use client'

import Link from 'next/link'

import { LockIcon, RefreshCwIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Catches any error thrown while rendering an admin page — most commonly
 * requirePermission()/requireAnyPermission() throwing AuthorizationError
 * when a staff account without the needed permission opens a page whose
 * link/button it reached some other way (e.g. a hardcoded dashboard link to
 * a feature the sidebar itself correctly hides for that account).
 *
 * Next.js strips a thrown error's real `message` in production for any
 * error that isn't explicitly marked safe — so this can't reliably pattern-
 * match "was this specifically a permission error" from error.message once
 * deployed. Showing one calm, generic "you don't have access" screen for
 * ANY admin-page render error is the deliberately safe choice here: it's
 * correct messaging for the actual reported case (permission errors), and
 * for a genuine unexpected bug it's still better than a raw stack trace
 * being shown to office staff, while the real error is still logged
 * server-side via logServerError at the point it was thrown.
 */
export default function AdminErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center'>
      <div className='flex size-14 items-center justify-center rounded-full bg-amber-100'>
        <LockIcon className='size-7 text-amber-700' />
      </div>
      <div>
        <h1 className='text-lg font-bold text-[#0c2847]'>You don&apos;t have access to this page</h1>
        <p className='mt-1.5 max-w-sm text-sm text-muted-foreground'>
          Your account doesn&apos;t have permission for this section. If you believe this is a mistake, contact your
          Super Admin to review your access.
        </p>
      </div>
      <div className='mt-2 flex items-center gap-2'>
        <Button type='button' variant='outline' onClick={() => reset()}>
          <RefreshCwIcon className='size-4' />
          Try Again
        </Button>
        <Button type='button' render={<Link href='/admin/dashboard' />} className='bg-[#0c2847] hover:bg-[#12365c] text-white'>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
