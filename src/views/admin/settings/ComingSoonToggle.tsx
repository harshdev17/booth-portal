'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import { AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'

/**
 * On/off switch for the site-wide Coming Soon gate. Saves immediately on
 * toggle (PATCH /api/admin/settings/coming-soon) and shows the live state;
 * the public site picks the change up within a few seconds (src/proxy.ts
 * caches the flag briefly).
 */
const ComingSoonToggle = ({ initialEnabled }: { initialEnabled: boolean }) => {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async (next: boolean) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings/coming-soon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next })
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))

        setError(body.error ?? 'Could not update Coming Soon mode.')

        return
      }

      setEnabled(next)
      router.refresh()
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <Alert>
        {enabled ? <AlertTriangleIcon className='size-4' /> : <CheckCircle2Icon className='size-4 text-emerald-600' />}
        <AlertDescription>
          {enabled
            ? 'Coming Soon mode is ON — the public site is currently hidden from visitors.'
            : 'Coming Soon mode is OFF — the public site is live and visible to everyone.'}
        </AlertDescription>
      </Alert>

      <div className='flex items-center justify-between gap-4 rounded-xl border bg-white px-5 py-4 shadow-xs'>
        <div>
          <p className='text-sm font-semibold text-slate-800'>Show &quot;Coming Soon&quot; page to visitors</p>
          <p className='mt-1 max-w-xl text-xs text-muted-foreground'>
            Turn on to hide the public site behind the Coming Soon page. Admins stay logged in and can still preview the
            real site. Takes effect within a few seconds.
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-3'>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              enabled ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
          <Switch checked={enabled} disabled={saving} onCheckedChange={toggle} aria-label='Coming Soon mode' />
        </div>
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ComingSoonToggle
