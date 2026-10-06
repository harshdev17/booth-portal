import type { Metadata } from 'next'

import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { requirePermission } from '@/lib/rbac/authorize'

const ENV_ROWS: Array<{ label: string; envVar: string; note: string }> = [
  {
    label: 'Site Key',
    envVar: 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
    note: 'Public — embedded in the applicant-facing page. Next.js inlines NEXT_PUBLIC_* values at build time, so the app must be rebuilt (not just restarted) after setting or changing this one.'
  },
  {
    label: 'Secret Key',
    envVar: 'RECAPTCHA_SECRET_KEY',
    note: 'Server-only, used to verify each submission with Google. Takes effect on the next server restart — no rebuild needed.'
  }
]

export const metadata: Metadata = {
  title: 'reCAPTCHA Settings — IGM Admin Portal'
}

/**
 * Read-only configuration status, same pattern as the Razorpay/WhatsApp
 * Settings pages — values are set via environment variables on the server,
 * not editable from this UI, and the secret key is never rendered here even
 * partially (.ai/SECURITY.md).
 *
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox) on the application Review
 * page's final Submit step (ReviewPageView.tsx → /api/applications/[id]/finalize).
 * Deliberately a no-op until RECAPTCHA_SECRET_KEY is set — the form keeps
 * accepting submissions without it, so this page is safe to leave
 * "Not configured" for as long as needed.
 */
const RecaptchaSettingsPage = async () => {
  await requirePermission('config:manage')

  const rows = ENV_ROWS.map(row => ({ ...row, configured: !!process.env[row.envVar] }))
  const bothConfigured = rows.every(r => r.configured)

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>reCAPTCHA Settings</h1>
        <p className='text-sm text-muted-foreground'>
          Configuration status for the Google reCAPTCHA (v2 checkbox) widget on the public application form&apos;s
          final submit step. Values are set via environment variables, not editable from this UI.
        </p>
      </div>

      {!bothConfigured && (
        <Alert>
          <AlertTriangleIcon className='size-4' />
          <AlertDescription>
            Not fully configured yet — the application form currently accepts submissions without a CAPTCHA check.
            Get a Site Key and Secret Key at{' '}
            <a
              href='https://www.google.com/recaptcha/admin/create'
              target='_blank'
              rel='noopener noreferrer'
              className='font-semibold underline'
            >
              google.com/recaptcha/admin
            </a>{' '}
            (choose reCAPTCHA v2, &quot;I&apos;m not a robot&quot; Checkbox) and set both environment variables below.
          </AlertDescription>
        </Alert>
      )}

      <Card className='shadow-xs'>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {rows.map(row => (
              <div key={row.envVar} className='flex items-start justify-between gap-4 px-4 py-3'>
                <div className='flex items-start gap-3'>
                  {row.configured ? (
                    <CheckCircle2Icon className='mt-0.5 size-5 shrink-0 text-emerald-600' />
                  ) : (
                    <XCircleIcon className='mt-0.5 size-5 shrink-0 text-red-600' />
                  )}
                  <div>
                    <p className='text-sm font-semibold text-slate-800'>{row.label}</p>
                    <p className='font-mono text-xs text-muted-foreground'>{row.envVar}</p>
                    <p className='mt-1 max-w-xl text-xs text-muted-foreground'>{row.note}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    row.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {row.configured ? 'Configured' : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RecaptchaSettingsPage
