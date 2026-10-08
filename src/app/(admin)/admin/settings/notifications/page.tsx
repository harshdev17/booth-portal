import type { Metadata } from 'next'

import { CheckCircle2Icon, MessageSquareIcon, XCircleIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requirePermission } from '@/lib/rbac/authorize'
import SendTestNotification from '@/views/admin/settings/SendTestNotification'

export const metadata: Metadata = {
  title: 'WhatsApp / SMS Settings — IGM Admin Portal'
}

const CATEGORY_ENV_MAP: Array<{ category: string; label: string; envVar: string }> = [
  { category: 'otp', label: 'OTP Verification', envVar: 'AISENSY_CAMPAIGN_OTP' },
  { category: 'application_confirmation', label: 'Application Confirmation', envVar: 'AISENSY_CAMPAIGN_APPLICATION_CONFIRMATION' },
  { category: 'payment_confirmation', label: 'Payment Confirmation', envVar: 'AISENSY_CAMPAIGN_PAYMENT_CONFIRMATION' },
  { category: 'status_update', label: 'Status Update', envVar: 'AISENSY_CAMPAIGN_STATUS_UPDATE' },
  { category: 'document_query', label: 'Document Query', envVar: 'AISENSY_CAMPAIGN_DOCUMENT_QUERY' },
  { category: 'pay_now_activation', label: 'Pay Now Activation', envVar: 'AISENSY_CAMPAIGN_PAY_NOW_ACTIVATION' },
  { category: 'reminder', label: 'Reminder', envVar: 'AISENSY_CAMPAIGN_REMINDER' }
]

/**
 * Read-only configuration status per .ai/NOTIFICATIONS.md / .ai/DECISIONS.md
 * #11a — AiSensy is the provider, but each notification category only works
 * once its WhatsApp template is Meta-approved AND its API Campaign is
 * created/published in the AiSensy dashboard (a dashboard step, not a code
 * change — see CHANGELOG.md 2026-09-28). This page shows which categories
 * are configured via env vars; it never reads or displays AISENSY_API_KEY.
 */
const NotificationSettingsPage = async () => {
  await requirePermission('config:manage')

  const apiKeyConfigured = !!process.env.AISENSY_API_KEY

  const rows = CATEGORY_ENV_MAP.map(row => ({
    ...row,
    campaignName: process.env[row.envVar] ?? null
  }))

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>WhatsApp / SMS Settings</h1>
        <p className='text-sm text-muted-foreground'>
          Status of each WhatsApp notification sent to applicants. These are set up by the technical team and cannot
          be edited here.
        </p>
      </div>

      <Card className='shadow-xs'>
        <CardContent className='flex items-center gap-3 pt-6'>
          {apiKeyConfigured ? (
            <CheckCircle2Icon className='size-5 text-emerald-600' />
          ) : (
            <XCircleIcon className='size-5 text-red-600' />
          )}
          <div>
            <p className='text-sm font-semibold text-slate-800'>WhatsApp service connection</p>
            <p className='text-xs text-muted-foreground'>
              {apiKeyConfigured
                ? 'Connected.'
                : 'Not connected — no WhatsApp message will be sent until the technical team completes the setup.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Notification Categories</CardTitle>
          <CardDescription className='text-xs'>
            A notification that is not configured is skipped and recorded as failed; it never blocks the applicant.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {rows.map(row => (
              <div key={row.category} className='flex items-center justify-between gap-4 px-4 py-3'>
                <div className='flex items-center gap-3'>
                  <MessageSquareIcon className='size-4 text-muted-foreground' />
                  <div>
                    <p className='text-sm font-semibold text-slate-800'>{row.label}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    row.campaignName ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {row.campaignName ? 'Configured' : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className='text-xs text-muted-foreground'>
        Message wording and WhatsApp approval are managed in the WhatsApp messaging service, not in this application.
      </p>

      <SendTestNotification />
    </div>
  )
}

export default NotificationSettingsPage
