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
 * Settings pages — this is env-var controlled, not editable from this UI.
 * When COMING_SOON_MODE is 'true', the gate in src/proxy.ts blocks every
 * route on this deployment (including /admin and /api) with no exceptions,
 * so this page itself would not even be reachable while it's on — it only
 * ever shows "ON" here in the moment just before/after a restart with the
 * var flipped, or if someone reaches it through a deployment that
 * mistakenly left /admin unblocked some other way.
 */
const ComingSoonSettingsPage = async () => {
  await requirePermission('config:manage')

  const isActive = process.env.COMING_SOON_MODE === 'true'

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Coming Soon Mode</h1>
        <p className='text-sm text-muted-foreground'>
          When on, every single route on this deployment is blocked and redirected to a &quot;Coming Soon&quot; page —
          with no exceptions, not even /admin or /api. There is no in-app preview bypass. Use this for a deployment
          that should show nothing but the holding page (e.g. the live domain while real work happens on a separate
          test domain that has this variable turned off).
        </p>
      </div>

      <Alert>
        {isActive ? <AlertTriangleIcon className='size-4' /> : <CheckCircle2Icon className='size-4 text-emerald-600' />}
        <AlertDescription>
          {isActive
            ? 'Coming Soon mode is ON — every route on this deployment is hidden, including the admin panel.'
            : 'Coming Soon mode is OFF — this deployment is live and fully usable.'}
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
                  Set this environment variable to <code className='font-mono'>true</code> to lock this deployment down
                  to only the Coming Soon page, or remove it (or set it to <code className='font-mono'>false</code>) to
                  make the deployment fully usable. Takes effect on the next server restart — no rebuild needed.
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
