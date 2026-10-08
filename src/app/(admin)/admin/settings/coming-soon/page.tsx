import type { Metadata } from 'next'

import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { requirePermission } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Coming Soon Mode — IGM Admin Portal'
}

/**
 * Read-only configuration status, same pattern as the Razorpay/reCAPTCHA
 * Settings pages — this is env-var controlled, not editable from this UI,
 * because the gate itself runs in src/proxy.ts (edge-runtime middleware,
 * which can't reach MySQL — see hasValidSessionToken()'s own comment there
 * for the same constraint), so it can't read a DB-backed toggle.
 */
const ComingSoonSettingsPage = async () => {
  await requirePermission('config:manage')

  const isActive = process.env.COMING_SOON_MODE === 'true'

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Coming Soon Mode</h1>
        <p className='text-sm text-muted-foreground'>
          When on, every visitor is redirected to a &quot;Coming Soon&quot; page instead of the public site. The admin panel
          (everything under /admin) and all /api routes stay reachable either way, so you can still log in and work.
          A logged-in admin also sees the real public site (not the Coming Soon page) in the same browser — log in
          here, then open the site in a new tab to preview it, e.g. the application form.
        </p>
      </div>

      <Alert>
        {isActive ? <AlertTriangleIcon className='size-4' /> : <CheckCircle2Icon className='size-4 text-emerald-600' />}
        <AlertDescription>
          {isActive
            ? 'Coming Soon mode is ON — the public site is currently hidden from visitors.'
            : 'Coming Soon mode is OFF — the public site is live and visible to everyone.'}
        </AlertDescription>
      </Alert>

      <Card className='shadow-xs'>
        <CardContent className='p-0'>
          <div className='flex items-start justify-between gap-4 px-4 py-3'>
            <div className='flex items-start gap-3'>
              {isActive ? (
                <CheckCircle2Icon className='mt-0.5 size-5 shrink-0 text-emerald-600' />
              ) : (
                <XCircleIcon className='mt-0.5 size-5 shrink-0 text-red-600' />
              )}
              <div>
                <p className='text-sm font-semibold text-slate-800'>Coming Soon Mode</p>
                <p className='font-mono text-xs text-muted-foreground'>COMING_SOON_MODE</p>
                <p className='mt-1 max-w-xl text-xs text-muted-foreground'>
                  Set this environment variable to <code className='font-mono'>true</code> to turn the gate on, or
                  remove it (or set it to <code className='font-mono'>false</code>) to turn it off. Takes effect on
                  the next server restart — no rebuild needed.
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isActive ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isActive ? 'ON' : 'OFF'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ComingSoonSettingsPage
