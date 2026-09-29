import type { Metadata } from 'next'

import { CheckCircle2Icon, XCircleIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { requirePermission } from '@/lib/rbac/authorize'
import TestRazorpayConnection from '@/views/admin/settings/TestRazorpayConnection'

export const metadata: Metadata = {
  title: 'Razorpay Settings — KDB Admin Portal'
}

const ENV_ROWS: Array<{ label: string; envVar: string }> = [
  { label: 'Key ID', envVar: 'RAZORPAY_KEY_ID' },
  { label: 'Key Secret', envVar: 'RAZORPAY_KEY_SECRET' },
  { label: 'Webhook Secret', envVar: 'RAZORPAY_WEBHOOK_SECRET' }
]

/**
 * Read-only configuration status, same pattern as the WhatsApp/SMS Settings
 * page (src/app/(admin)/admin/settings/notifications/page.tsx). Per
 * .ai/SECURITY.md, the secret key and webhook secret are never rendered
 * here even partially — only whether each is configured.
 */
const RazorpaySettingsPage = async () => {
  await requirePermission('config:manage')

  const rows = ENV_ROWS.map(row => ({ ...row, configured: !!process.env[row.envVar] }))
  const keyId = process.env.RAZORPAY_KEY_ID

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Razorpay Settings</h1>
        <p className='text-sm text-muted-foreground'>
          Configuration status for the Razorpay payment gateway used to collect application fees. Values are set via
          environment variables, not editable from this UI.
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {rows.map(row => (
              <div key={row.envVar} className='flex items-center justify-between gap-4 px-4 py-3'>
                <div className='flex items-center gap-3'>
                  {row.configured ? (
                    <CheckCircle2Icon className='size-5 text-emerald-600' />
                  ) : (
                    <XCircleIcon className='size-5 text-red-600' />
                  )}
                  <div>
                    <p className='text-sm font-semibold text-slate-800'>{row.label}</p>
                    <p className='font-mono text-xs text-muted-foreground'>{row.envVar}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    row.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {row.envVar === 'RAZORPAY_KEY_ID' && row.configured
                    ? keyId
                    : row.configured
                      ? 'Configured'
                      : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TestRazorpayConnection />

      <p className='text-xs text-muted-foreground'>
        The webhook endpoint is <code className='rounded bg-muted px-1 py-0.5'>/api/webhooks/razorpay</code> —
        configure this URL in the Razorpay dashboard&apos;s webhook settings (Payments → Webhooks) with the{' '}
        <code className='rounded bg-muted px-1 py-0.5'>payment.captured</code> and{' '}
        <code className='rounded bg-muted px-1 py-0.5'>payment.failed</code> events enabled, and set the same secret
        as <code className='rounded bg-muted px-1 py-0.5'>RAZORPAY_WEBHOOK_SECRET</code>.
      </p>
    </div>
  )
}

export default RazorpaySettingsPage
