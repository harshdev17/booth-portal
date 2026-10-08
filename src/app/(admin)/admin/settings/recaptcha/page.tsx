import type { Metadata } from 'next'

import { AlertTriangleIcon, CheckCircle2Icon, XCircleIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { requirePermission } from '@/lib/rbac/authorize'

const ENV_ROWS: Array<{ label: string; envVar: string; note: string }> = [
  {
    label: 'Site Key',
    envVar: 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
    note: 'Shown to the Google reCAPTCHA service from the application form.'
  },
  {
    label: 'Secret Key',
    envVar: 'RECAPTCHA_SECRET_KEY',
    note: 'Used privately to verify each submission with Google.'
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
 * Google reCAPTCHA v3 (invisible, score-based — no checkbox) on the
 * application Review page's final Submit step
 * (ReviewPageView.tsx → /api/applications/[id]/finalize). Deliberately a
 * no-op until RECAPTCHA_SECRET_KEY is set — the form keeps accepting
 * submissions without it, so this page is safe to leave "Not configured"
 * for as long as needed. v3 keys are a different type from v2 — a v2 site
 * registered at Google will NOT work here.
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
          Status of the Google reCAPTCHA (invisible spam check) on the final submit step of the application form.
          These keys are set up by the technical team and cannot be edited here.
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
            (choose reCAPTCHA v3) and hand both keys to the technical team to set up. Keys from an older v2 setup
            will not work.
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
