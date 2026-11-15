'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import { CheckCircle2Icon, Loader2Icon, MailIcon, MessageSquareIcon, RotateCcwIcon, XCircleIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

export type NotificationLogRow = {
  id: number
  channel: 'whatsapp' | 'sms' | 'email'
  category: string
  destination: string
  campaign_name: string | null
  status: 'sent' | 'failed'
  error_message: string | null
  created_at: string
  application_number: string | null
  representative_name: string | null
}

type ResendResult = {
  resentCount: number
  skippedOtpCount: number
  skippedUnresolvableCount: number
  failedCount: number
}

const ChannelIcon = ({ channel }: { channel: NotificationLogRow['channel'] }) => {
  if (channel === 'email') return <MailIcon className='size-4 text-blue-600' />

  return <MessageSquareIcon className='size-4 text-emerald-600' />
}

/**
 * Resend only ever targets `status='failed'` rows, and never `category='otp'`
 * (resending a literal OTP code is impossible by design — only its hash is
 * stored; a failed OTP needs a fresh one issued through the normal flow, not
 * a replay). Every other failed row's checkbox is selectable.
 */
const isResendable = (row: NotificationLogRow) => row.status === 'failed' && row.category !== 'otp'

const NotificationLogsClient = ({ entries }: { entries: NotificationLogRow[] }) => {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [result, setResult] = useState<ResendResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resendableRows = useMemo(() => entries.filter(isResendable), [entries])

  const selectedResendableCount = useMemo(
    () => resendableRows.filter(row => selectedIds.has(row.id)).length,
    [resendableRows, selectedIds]
  )

  const allSelected = resendableRows.length > 0 && selectedResendableCount === resendableRows.length

  const toggleRow = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (checked) next.add(id)
      else next.delete(id)

      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(resendableRows.map(row => row.id)) : new Set())
  }

  const handleResend = async () => {
    setIsResending(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/notification-logs/bulk-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationLogIds: Array.from(selectedIds) })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Could not resend the selected notifications.')

        return
      }

      setResult(data)
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const closeDialog = () => {
    setConfirmOpen(false)
    setResult(null)
    setError(null)
  }

  return (
    <div className='flex flex-col'>
      {selectedResendableCount > 0 && (
        <div className='flex items-center justify-between gap-3 border-b bg-amber-50/60 px-4 py-2.5'>
          <p className='text-xs font-semibold text-amber-900'>{selectedResendableCount} failed notification(s) selected</p>
          <Button size='sm' onClick={() => setConfirmOpen(true)} className='bg-[#0c2847] hover:bg-[#071f3a] text-white'>
            <RotateCcwIcon className='size-3.5' />
            Resend Selected
          </Button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className='py-12 text-center'>
          <p className='text-sm font-semibold text-muted-foreground'>No notification logs match these filters.</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm'>
            <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
              <tr>
                <th className='w-10 py-3 px-4'>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={checked => toggleAll(checked === true)}
                    disabled={resendableRows.length === 0}
                    aria-label='Select all resendable'
                  />
                </th>
                <th className='py-3 px-4'>When</th>
                <th className='py-3 px-4'>Channel</th>
                <th className='py-3 px-4'>Category</th>
                <th className='py-3 px-4'>Destination</th>
                <th className='py-3 px-4'>Application</th>
                <th className='py-3 px-4'>Status</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {entries.map(row => {
                const resendable = isResendable(row)

                return (
                  <tr key={row.id} className='align-top hover:bg-muted/30 transition'>
                    <td className='py-3 px-4'>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={checked => toggleRow(row.id, checked === true)}
                        disabled={!resendable}
                        aria-label={`Select notification ${row.id}`}
                      />
                    </td>
                    <td className='py-3 px-4 text-xs whitespace-nowrap text-muted-foreground'>
                      {new Date(row.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className='py-3 px-4'>
                      <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700'>
                        <ChannelIcon channel={row.channel} />
                        {row.channel === 'whatsapp' ? 'WhatsApp' : row.channel === 'sms' ? 'SMS' : 'Email'}
                      </span>
                    </td>
                    <td className='py-3 px-4 text-xs text-slate-700'>{row.category}</td>
                    <td className='py-3 px-4 text-xs text-slate-700'>{row.destination}</td>
                    <td className='py-3 px-4 text-xs'>
                      {row.application_number ? (
                        <>
                          <p className='font-semibold text-[#0c2847]'>{row.application_number}</p>
                          <p className='text-muted-foreground'>{row.representative_name}</p>
                        </>
                      ) : (
                        <span className='text-muted-foreground'>—</span>
                      )}
                    </td>
                    <td className='py-3 px-4'>
                      <div className='flex items-center gap-1.5'>
                        {row.status === 'sent' ? (
                          <CheckCircle2Icon className='size-3.5 text-emerald-600' />
                        ) : (
                          <XCircleIcon className='size-3.5 text-red-600' />
                        )}
                        <span
                          className={`text-xs font-bold ${row.status === 'sent' ? 'text-emerald-700' : 'text-red-700'}`}
                        >
                          {row.status === 'sent' ? 'Sent' : 'Failed'}
                        </span>
                      </div>
                      {row.status === 'failed' && row.error_message && (
                        <p className='mt-0.5 max-w-xs text-[11px] text-red-700'>{row.error_message}</p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={open => (open ? setConfirmOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend Failed Notifications</DialogTitle>
            <DialogDescription>
              This will attempt to resend {selectedResendableCount} failed notification(s) using the applicant&apos;s
              current application data. OTP notifications are never resent. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result ? (
            <Alert className='border-emerald-300 bg-emerald-50 text-emerald-800'>
              <AlertDescription className='font-semibold'>
                {result.resentCount} resent. {result.skippedUnresolvableCount} could not be reconstructed.{' '}
                {result.failedCount} failed again. {result.skippedOtpCount} OTP skipped.
              </AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            {result ? (
              <Button onClick={closeDialog}>Close</Button>
            ) : (
              <>
                <Button type='button' variant='outline' onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={handleResend} disabled={isResending}>
                  {isResending && <Loader2Icon className='size-3.5 animate-spin' />}
                  Confirm & Resend
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NotificationLogsClient
