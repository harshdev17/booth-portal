'use client'

import { type ReactNode, useMemo, useState } from 'react'

import { CheckCircle2Icon, MailIcon, MessageSquareIcon, SearchIcon, XCircleIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAuditActionLabel, getRoleDisplayName } from '@/lib/audit/action-labels'
import { getApplicationStatusConfig } from '@/lib/applications/status-config'

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

const CUSTOM_KEY_LABELS: Record<string, string> = {
  mobile_number: 'Mobile Number',
  phone_number: 'Phone Number',
  pin_code: 'PIN Code',
  pincode: 'PIN Code',
  aadhaar_last4: 'Aadhaar (Last 4)',
  police_station_name: 'Police Station Name',
  police_station_address: 'Police Station Address',
  representative_name: 'Representative Name',
  father_name: "Father's Name",
  organisation_name: 'Organisation Name',
  applicantNotes: 'Applicant Notes',
  returnedToReview: 'Returned to Review',
  fieldsMarkedChecked: 'Fields Verified',
  categoryFields: 'Category Specific Fields',
  status: 'Status',
  reason: 'Reason',
  remarks: 'Remarks',
  notified: 'Applicant Notified',
  email: 'Email',
  address: 'Address',
  city: 'City',
  state: 'State',
  district: 'District'
}

function humanizeAuditKey(key: string): string {
  if (CUSTOM_KEY_LABELS[key]) return CUSTOM_KEY_LABELS[key]
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase())
}

function parseJsonSafe(val: unknown): unknown {
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed)
      } catch {}
    }
  }
  return val
}

function isEmptyValue(val: unknown): boolean {
  if (val === null || val === undefined) return true
  if (typeof val === 'string' && val.trim() === '') return true
  if (Array.isArray(val) && val.length === 0) return true
  if (typeof val === 'object' && Object.keys(val as object).length === 0) return true
  return false
}

function formatPrimitive(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

function renderAuditDiff(previousValue: unknown, newValue: unknown): ReactNode {
  const prevParsed = parseJsonSafe(previousValue)
  const nextParsed = parseJsonSafe(newValue)

  const prev = (prevParsed && typeof prevParsed === 'object' && !Array.isArray(prevParsed)
    ? prevParsed
    : {}) as Record<string, unknown>
  const next = (nextParsed && typeof nextParsed === 'object' && !Array.isArray(nextParsed)
    ? nextParsed
    : {}) as Record<string, unknown>

  const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)])).filter(
    key => !AUDIT_DIFF_SKIP_KEYS.has(key)
  )

  if (keys.length === 0) return null

  return (
    <div className='mt-1.5 flex flex-col gap-1.5'>
      {keys.map(key => {
        const hasOld = key in prev
        let oldVal = parseJsonSafe(prev[key])
        let newVal = parseJsonSafe(next[key])

        // Suppress key if both old and new are completely empty
        if (isEmptyValue(oldVal) && isEmptyValue(newVal)) return null
        if (newVal === undefined && !hasOld) return null

        // 1. STATUS change with clean labels and colored transition
        if (key === 'status') {
          const oldLabel = oldVal ? getApplicationStatusConfig(String(oldVal)).label : null
          const newLabel = newVal ? getApplicationStatusConfig(String(newVal)).label : null

          return (
            <div key={key} className='mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-700'>
              <span className='font-semibold text-slate-500'>Status:</span>
              {hasOld && oldLabel ? (
                <>
                  <span className='rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 line-through'>
                    {oldLabel}
                  </span>
                  <span className='text-slate-400 font-bold'>→</span>
                  <span className='rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800'>
                    {newLabel}
                  </span>
                </>
              ) : (
                <span className='rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800'>
                  {newLabel}
                </span>
              )}
            </div>
          )
        }

        // 2. FIELDS (both plain objects from application edit, and arrays from query response)
        if (key === 'fields') {
          // Case A: Plain key-value object (from application edit)
          if (
            (oldVal && typeof oldVal === 'object' && !Array.isArray(oldVal)) ||
            (newVal && typeof newVal === 'object' && !Array.isArray(newVal))
          ) {
            const oldObj = (oldVal && typeof oldVal === 'object' && !Array.isArray(oldVal) ? oldVal : {}) as Record<string, unknown>
            const newObj = (newVal && typeof newVal === 'object' && !Array.isArray(newVal) ? newVal : {}) as Record<string, unknown>
            const innerKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))
            const changed = innerKeys.filter(k => {
              const o = oldObj[k]
              const n = newObj[k]
              if (isEmptyValue(o) && isEmptyValue(n)) return false
              return String(o ?? '') !== String(n ?? '')
            })

            if (changed.length === 0) return null

            return (
              <div key={key} className='mt-1 flex flex-col gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 p-2.5'>
                <span className='text-xs font-semibold text-[#0c2847]'>Edited Application Fields:</span>
                <div className='flex flex-col gap-1 pl-1'>
                  {changed.map(k => {
                    const o = oldObj[k]
                    const n = newObj[k]
                    const hasO = !isEmptyValue(o)

                    return (
                      <div key={k} className='flex flex-wrap items-center gap-1.5 text-xs text-slate-600'>
                        <span className='font-semibold text-slate-700'>{humanizeAuditKey(k)}:</span>
                        {hasO && <span className='text-slate-400 line-through mr-1'>{formatPrimitive(o)}</span>}
                        <span className='font-bold text-[#0c2847]'>{formatPrimitive(n)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }

          // Case B: Array of field items (from applicant field query response)
          if (Array.isArray(newVal) || Array.isArray(oldVal)) {
            const oldList = (Array.isArray(oldVal) ? oldVal : []) as Array<{ fieldKey?: string; value?: unknown }>
            const newList = (Array.isArray(newVal) ? newVal : []) as Array<{ fieldKey?: string; fieldLabel?: string; value?: unknown }>

            if (newList.length === 0 && oldList.length === 0) return null

            return (
              <div key={key} className='mt-1 flex flex-col gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 p-2.5'>
                <span className='text-xs font-semibold text-[#0c2847]'>Corrected Fields:</span>
                <div className='flex flex-col gap-1 pl-1'>
                  {newList.map((item, idx) => {
                    const oldItem = oldList.find(o => o?.fieldKey === item?.fieldKey)
                    const label = item?.fieldLabel || humanizeAuditKey(item?.fieldKey || 'Field')
                    const hasOldValue =
                      oldItem &&
                      !isEmptyValue(oldItem.value) &&
                      String(oldItem.value) !== String(item?.value)

                    return (
                      <div key={idx} className='flex flex-wrap items-center gap-1.5 text-xs text-slate-600'>
                        <span className='font-semibold text-slate-700'>{label}:</span>
                        {hasOldValue && (
                          <span className='text-slate-400 line-through mr-1'>{formatPrimitive(oldItem.value)}</span>
                        )}
                        <span className='font-bold text-[#0c2847]'>{formatPrimitive(item?.value)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
        }

        // 3. CATEGORY FIELDS
        if (key === 'categoryFields') {
          if (isEmptyValue(oldVal) && isEmptyValue(newVal)) return null
          if (Array.isArray(newVal)) {
            if (newVal.length === 0) return null
            return (
              <div key={key} className='mt-1 flex flex-col gap-1 rounded border border-slate-200 bg-slate-50 p-2 text-xs'>
                <span className='font-semibold text-slate-700'>Category Specific Fields:</span>
                <div className='flex flex-col gap-0.5 pl-1'>
                  {newVal.map((item: any, idx: number) => (
                    <div key={idx} className='text-slate-600'>
                      <span className='font-medium'>{item.label || `Field #${item.fieldDefinitionId}`}:</span>{' '}
                      <span className='font-semibold text-[#0c2847]'>{formatPrimitive(item.value ?? item.next)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          return null
        }

        // 4. FIELDS MARKED CHECKED (approval checklist)
        if (key === 'fieldsMarkedChecked') {
          if (isEmptyValue(newVal)) return null
          const list = Array.isArray(newVal) ? newVal : [newVal]
          if (list.length === 0) return null

          return (
            <p key={key} className='text-xs text-slate-600'>
              <span className='font-semibold text-slate-500'>Verified Fields:</span>{' '}
              <span className='font-semibold text-[#0c2847]'>
                {list.map(f => humanizeAuditKey(String(f))).join(', ')}
              </span>
            </p>
          )
        }

        // 5. NOTIFIED
        if (key === 'notified') {
          if (!newVal) return null // Hide noisy "Notified: false"
          return (
            <p key={key} className='text-xs text-emerald-700 font-semibold'>
              Applicant notified via SMS/WhatsApp
            </p>
          )
        }

        // 6. RETURNED TO REVIEW
        if (key === 'returnedToReview') {
          if (!newVal) return null // Hide noisy false
          return (
            <p key={key} className='text-xs text-blue-700 font-medium'>
              Status returned to Under Review automatically
            </p>
          )
        }

        // 7. APPLICANT NOTES
        if (key === 'applicantNotes') {
          if (isEmptyValue(newVal)) return null
          return (
            <div key={key} className='mt-1 rounded border border-blue-100 bg-blue-50/70 p-2 text-xs text-blue-900'>
              <span className='font-bold text-blue-950'>Applicant Notes:</span> {String(newVal)}
            </div>
          )
        }

        // 8. IDENTICAL VALUES CHECK
        if (hasOld && String(oldVal ?? '') === String(newVal ?? '')) return null

        // 9. GENERIC CLEAN RENDERER
        return (
          <p key={key} className='text-xs text-slate-600'>
            <span className='font-semibold text-slate-500'>{humanizeAuditKey(key)}:</span>{' '}
            {hasOld && !isEmptyValue(oldVal) ? (
              <>
                <span className='text-slate-400 line-through mr-1'>{formatPrimitive(oldVal)}</span>
                <span className='font-semibold text-[#0c2847]'>{formatPrimitive(newVal)}</span>
              </>
            ) : (
              <span className='font-semibold text-[#0c2847]'>{formatPrimitive(newVal)}</span>
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
