'use client'

import { type ReactNode, useMemo, useState } from 'react'

import { CheckCircle2Icon, MailIcon, MessageSquareIcon, SearchIcon, XCircleIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAuditActionLabel, getRoleDisplayName } from '@/lib/audit/action-labels'

type AuditEntry = {
  id: number
  action: string
  actor_role_key: string | null
  previous_value: string | null
  new_value: string | null
  created_at: string
}

type NotificationEntry = {
  channel: 'whatsapp' | 'sms' | 'email'
  category: string
  destination: string
  status: 'sent' | 'failed'
  error_message: string | null
  created_at: string
}

export type HistoryTimelineItem =
  | { kind: 'audit'; timestamp: string; entry: AuditEntry }
  | { kind: 'notification'; timestamp: string; entry: NotificationEntry }

// Generic best-effort "what changed" renderer for an audit entry's
// previous_value/new_value JSON — works for any current/future action
// without needing a hand-written special case per action. A key present in
// both shows as "key: old → new"; a key only in new_value shows as a plain
// addition. Deliberately skips a few noisy/low-signal keys that are
// already shown elsewhere on this page (IDs, filenames) to keep this
// readable rather than exhaustive.
const AUDIT_DIFF_SKIP_KEYS = new Set(['razorpayOrderId', 'razorpayPaymentId', 'filename', 'applicationNumber'])

function humanizeAuditKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase())
}

function renderAuditDiff(previousValue: unknown, newValue: unknown): ReactNode {
  const prev = (previousValue && typeof previousValue === 'object' ? previousValue : {}) as Record<string, unknown>
  const next = (newValue && typeof newValue === 'object' ? newValue : {}) as Record<string, unknown>

  const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)])).filter(
    key => !AUDIT_DIFF_SKIP_KEYS.has(key)
  )

  if (keys.length === 0) return null

  return (
    <div className='mt-1.5 flex flex-col gap-0.5'>
      {keys.map(key => {
        const hasOld = key in prev
        const oldVal = prev[key]
        const newVal = next[key]

        if (newVal === undefined && !hasOld) return null

        return (
          <p key={key} className='text-xs text-slate-600'>
            <span className='font-medium text-slate-500'>{humanizeAuditKey(key)}:</span>{' '}
            {hasOld ? (
              <>
                <span className='text-slate-400 line-through'>{String(oldVal)}</span>{' '}
                <span className='font-semibold text-[#0c2847]'>{String(newVal)}</span>
              </>
            ) : (
              <span className='font-semibold text-[#0c2847]'>{String(newVal)}</span>
            )}
          </p>
        )
      })}
    </div>
  )
}

const NOTIFICATION_CATEGORY_LABEL: Record<string, string> = {
  otp: 'OTP',
  application_confirmation: 'Application Confirmation',
  payment_confirmation: 'Payment Confirmation',
  status_update: 'Status Update',
  document_query: 'Document Query',
  pay_now_activation: 'Payment Activation',
  reminder: 'Payment Reminder'
}

const NotificationChannelIcon = ({ channel }: { channel: 'whatsapp' | 'sms' | 'email' }) => {
  if (channel === 'email') return <MailIcon className='size-4 text-blue-600' />

  return <MessageSquareIcon className='size-4 text-emerald-600' />
}

/** Flattened to plain text so a search term can match against it, regardless of entry kind. */
function searchableText(item: HistoryTimelineItem): string {
  if (item.kind === 'audit') {
    const { entry } = item

    return [
      getAuditActionLabel(entry.action),
      entry.action,
      entry.actor_role_key ? getRoleDisplayName(entry.actor_role_key) : 'System',
      entry.previous_value ?? '',
      entry.new_value ?? ''
    ]
      .join(' ')
      .toLowerCase()
  }

  const { entry } = item

  return [
    NOTIFICATION_CATEGORY_LABEL[entry.category] ?? entry.category,
    entry.channel,
    entry.destination,
    entry.status,
    entry.error_message ?? ''
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * Admin/system audit events and applicant notifications (WhatsApp/SMS/
 * Email), merged into one searchable, time-ordered timeline. Search is
 * client-side only (no extra DB round trip) — the full merged history for
 * one application is already small enough (LIMIT 100 + LIMIT 50 server-side)
 * to filter instantly in the browser.
 */
const ApplicationHistoryTab = ({ history }: { history: HistoryTimelineItem[] }) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    if (!term) return history

    return history.filter(item => searchableText(item).includes(term))
  }, [history, searchTerm])

  return (
    <Card className='shadow-xs'>
      <CardHeader>
        <CardTitle className='text-base'>Audit Trail</CardTitle>
        <CardDescription className='text-xs'>
          Admin/system actions and applicant notifications (WhatsApp/SMS/Email), in one combined timeline.
        </CardDescription>
        <div className='relative mt-2'>
          <SearchIcon className='absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder='Search history (action, actor, message, status...)'
            className='h-8 pl-8 text-xs'
          />
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>No history for this application yet.</p>
        ) : filtered.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>No history entries match &quot;{searchTerm}&quot;.</p>
        ) : (
          <div className='space-y-3'>
            {filtered.map((item, index) => {
              if (item.kind === 'audit') {
                const { entry } = item
                const previousValue = entry.previous_value as unknown
                const newValue = entry.new_value as unknown

                return (
                  <div
                    key={`audit-${entry.id}`}
                    className='rounded-md border border-l-4 border-border/60 border-l-[#0c2847] px-3 py-2 text-sm'
                  >
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-[#0c2847]'>{getAuditActionLabel(entry.action)}</span>
                      <span className='text-xs text-muted-foreground'>
                        {new Date(entry.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      By: {entry.actor_role_key ? getRoleDisplayName(entry.actor_role_key) : 'System'}
                    </p>
                    {renderAuditDiff(previousValue, newValue)}
                  </div>
                )
              }

              const { entry } = item

              return (
                <div
                  key={`notification-${index}`}
                  className='flex items-start gap-2.5 rounded-md border border-l-4 border-border/60 border-l-emerald-500 px-3 py-2 text-sm'
                >
                  <NotificationChannelIcon channel={entry.channel} />
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <span className='font-semibold text-[#0c2847]'>
                        {NOTIFICATION_CATEGORY_LABEL[entry.category] ?? entry.category} (
                        {entry.channel === 'whatsapp' ? 'WhatsApp' : entry.channel === 'sms' ? 'SMS' : 'Email'})
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {new Date(entry.created_at).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className='mt-1 flex items-center gap-1.5'>
                      {entry.status === 'sent' ? (
                        <CheckCircle2Icon className='size-3.5 text-emerald-600' />
                      ) : (
                        <XCircleIcon className='size-3.5 text-red-600' />
                      )}
                      <span className={entry.status === 'sent' ? 'text-emerald-700' : 'text-red-700'}>
                        {entry.status === 'sent' ? 'Sent' : 'Failed'}
                      </span>
                      <span className='text-muted-foreground'>to {entry.destination}</span>
                    </div>
                    {entry.status === 'failed' && entry.error_message && (
                      <p className='mt-1 text-xs text-red-700'>{entry.error_message}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ApplicationHistoryTab
