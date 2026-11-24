'use client'

import { useState } from 'react'

import {
  AlertCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export type SiteNoticeBannersItem = {
  paymentPendingText: string
  paymentPendingTextHi: string
  paymentPendingEnabled: boolean
  letterAvailableText: string
  letterAvailableTextHi: string
  letterAvailableEnabled: boolean
}

export type CorrigendumRowItem = {
  id: number
  particular: string
  particular_hi: string
  previous_text: string
  previous_text_hi: string
  revised_text: string
  revised_text_hi: string
  display_order: number
  status: 'active' | 'inactive'
}

type NewRowDraft = {
  particular: string
  particularHi: string
  previous: string
  previousHi: string
  revised: string
  revisedHi: string
}

const EMPTY_DRAFT: NewRowDraft = { particular: '', particularHi: '', previous: '', previousHi: '', revised: '', revisedHi: '' }

/**
 * Admin editor for the homepage Corrigendum popup
 * (src/components/public/CorrigendumNoticeModal.tsx) — per explicit request
 * (2026-11-24), its "Previous"/"Revised" schedule rows were hardcoded in the
 * component before this; every date change needed a code deploy. Mirrors
 * NoticesSettingsClient.tsx's editing pattern (reorder/save/delete per row),
 * extended to this popup's 3 bilingual columns instead of 1.
 */
type TextSettings = {
  heading: string
  headingHi: string
  subheading: string
  subheadingHi: string
  footerText: string
  footerTextHi: string
}

export default function CorrigendumNoticeSettingsClient({
  enabled: initialEnabled,
  heading,
  headingHi,
  subheading,
  subheadingHi,
  footerText,
  footerTextHi,
  rows: initialRows,
  noticeBanners
}: {
  enabled: boolean
  rows: CorrigendumRowItem[]
  noticeBanners: SiteNoticeBannersItem
} & TextSettings) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false)
  const [text, setText] = useState<TextSettings>({ heading, headingHi, subheading, subheadingHi, footerText, footerTextHi })
  const [isSavingText, setIsSavingText] = useState(false)
  const [banners, setBanners] = useState<SiteNoticeBannersItem>(noticeBanners)
  const [isSavingBanners, setIsSavingBanners] = useState(false)
  const [rows, setRows] = useState(initialRows)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState<NewRowDraft>(EMPTY_DRAFT)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleToggleEnabled = async (next: boolean) => {
    setEnabled(next)
    setIsTogglingEnabled(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/corrigendum-notice/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next })
      })

      if (response.ok) {
        showSuccess(next ? 'Popup enabled — it will show on the homepage.' : 'Popup disabled.')
      } else {
        setEnabled(!next)
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to update.')
      }
    } catch {
      setEnabled(!next)
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsTogglingEnabled(false)
    }
  }

  const handleSaveText = async () => {
    setIsSavingText(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/corrigendum-notice/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(text)
      })

      if (response.ok) {
        showSuccess('Popup text saved.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to save text.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsSavingText(false)
    }
  }

  const saveBanners = async (payload: SiteNoticeBannersItem) => {
    const response = await fetch('/api/admin/site-notice-banners', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const data = await response.json()

      throw new Error(data.error ?? 'Failed to save.')
    }
  }

  const handleSaveBanners = async () => {
    setIsSavingBanners(true)
    setErrorMessage(null)

    try {
      await saveBanners(banners)
      showSuccess('Notice banner text saved.')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setIsSavingBanners(false)
    }
  }

  // Toggling a banner on/off saves immediately (same pattern as the
  // Corrigendum popup's own enable/disable Switch above) rather than waiting
  // for the "Save Banners" button — confirmed live (2026-11-25) that leaving
  // this as local-state-only until a separate click felt like it "wasn't
  // working" since nothing visibly happened on toggle.
  const handleToggleBanner = async (field: 'paymentPendingEnabled' | 'letterAvailableEnabled', checked: boolean) => {
    const next = { ...banners, [field]: checked }

    setBanners(next)
    setErrorMessage(null)

    try {
      await saveBanners(next)
      showSuccess(checked ? 'Banner enabled.' : 'Banner disabled.')
    } catch (err) {
      setBanners(banners)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update.')
    }
  }

  const handleFieldChange = (id: number, field: keyof CorrigendumRowItem, value: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleSaveRow = async (row: CorrigendumRowItem) => {
    setSavingId(row.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/corrigendum-notice/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          particular: row.particular,
          particularHi: row.particular_hi,
          previous: row.previous_text,
          previousHi: row.previous_text_hi,
          revised: row.revised_text,
          revisedHi: row.revised_text_hi
        })
      })

      const data = await response.json()

      if (response.ok) {
        showSuccess('Row saved.')
      } else {
        setErrorMessage(data.error ?? 'Failed to save row.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleStatus = async (row: CorrigendumRowItem) => {
    const nextStatus = row.status === 'active' ? 'inactive' : 'active'

    setSavingId(row.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/corrigendum-notice/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })

      if (response.ok) {
        setRows(prev => prev.map(r => (r.id === row.id ? { ...r, status: nextStatus } : r)))
        showSuccess(nextStatus === 'active' ? 'Row activated.' : 'Row deactivated.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to update status.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= rows.length) return

    const a = rows[index]
    const b = rows[targetIndex]

    const reordered = [...rows]

    reordered[index] = { ...b, display_order: a.display_order }
    reordered[targetIndex] = { ...a, display_order: b.display_order }
    setRows(reordered.sort((x, y) => x.display_order - y.display_order))

    setErrorMessage(null)

    try {
      await Promise.all([
        fetch(`/api/admin/corrigendum-notice/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: b.display_order })
        }),
        fetch(`/api/admin/corrigendum-notice/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: a.display_order })
        })
      ])
    } catch {
      setErrorMessage('Could not reorder rows. Please refresh and try again.')
    }
  }

  const handleDelete = async (row: CorrigendumRowItem) => {
    if (!window.confirm('Delete this row? This cannot be undone.')) return

    setSavingId(row.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/corrigendum-notice/${row.id}`, { method: 'DELETE' })

      if (response.ok) {
        setRows(prev => prev.filter(r => r.id !== row.id))
        showSuccess('Row deleted.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to delete row.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreate = async () => {
    const required = [draft.particular, draft.particularHi, draft.previous, draft.previousHi, draft.revised, draft.revisedHi]

    if (required.some(v => !v.trim())) {
      setErrorMessage('All six fields (English + Hindi) are required to add a row.')

      return
    }

    setIsCreating(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/corrigendum-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      })

      const data = await response.json()

      if (response.ok) {
        setRows(prev => [
          ...prev,
          {
            id: data.id,
            particular: draft.particular,
            particular_hi: draft.particularHi,
            previous_text: draft.previous,
            previous_text_hi: draft.previousHi,
            revised_text: draft.revised,
            revised_text_hi: draft.revisedHi,
            display_order: prev.length + 1,
            status: 'active'
          }
        ])
        setDraft(EMPTY_DRAFT)
        showSuccess('Row added.')
      } else {
        setErrorMessage(data.error ?? 'Failed to create row.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {successMessage && (
        <Alert className='border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl'>
          <CheckCircle2Icon className='size-5 text-emerald-600' />
          <AlertDescription className='font-semibold'>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant='destructive' className='rounded-xl'>
          <AlertCircleIcon className='size-5 text-red-600' />
          <AlertDescription className='font-semibold'>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card className='shadow-xs'>
        <CardHeader className='flex flex-row items-center justify-between border-b bg-muted/40 py-4'>
          <div>
            <CardTitle className='text-base font-bold text-[#0c2847]'>Corrigendum Popup</CardTitle>
            <CardDescription className='text-xs'>
              Shown to every visitor on the public homepage, right after the language prompt.
            </CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-semibold text-muted-foreground'>{enabled ? 'Enabled' : 'Disabled'}</span>
            <Switch checked={enabled} onCheckedChange={handleToggleEnabled} disabled={isTogglingEnabled} />
          </div>
        </CardHeader>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Popup Text</CardTitle>
          <CardDescription className='text-xs'>
            The heading, subheading, and closing note shown around the table in the popup.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 pt-6'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-muted-foreground'>Heading (English)</label>
              <Input
                value={text.heading}
                onChange={e => setText(prev => ({ ...prev, heading: e.target.value }))}
                maxLength={255}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-muted-foreground'>शीर्षक (हिंदी)</label>
              <Input
                value={text.headingHi}
                onChange={e => setText(prev => ({ ...prev, headingHi: e.target.value }))}
                maxLength={255}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-muted-foreground'>Subheading (English)</label>
              <Input
                value={text.subheading}
                onChange={e => setText(prev => ({ ...prev, subheading: e.target.value }))}
                maxLength={255}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-muted-foreground'>उपशीर्षक (हिंदी)</label>
              <Input
                value={text.subheadingHi}
                onChange={e => setText(prev => ({ ...prev, subheadingHi: e.target.value }))}
                maxLength={255}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-muted-foreground'>Footer note (English)</label>
              <Textarea
                value={text.footerText}
                onChange={e => setText(prev => ({ ...prev, footerText: e.target.value }))}
                maxLength={1000}
                rows={3}
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-muted-foreground'>फुटर नोट (हिंदी)</label>
              <Textarea
                value={text.footerTextHi}
                onChange={e => setText(prev => ({ ...prev, footerTextHi: e.target.value }))}
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>
          <Button
            onClick={handleSaveText}
            disabled={isSavingText}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isSavingText ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <SaveIcon className='size-3.5 mr-1.5' />}
            Save Text
          </Button>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Shared Notice Banners</CardTitle>
          <CardDescription className='text-xs'>
            These two disclaimers also appear on the /status page and the Allotment Letter page — editing here
            updates all three places at once.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-5 pt-6'>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-bold text-[#0c2847]'>Payment Pending Disclaimer</p>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {banners.paymentPendingEnabled ? 'Shown' : 'Hidden'}
                </span>
                <Switch
                  checked={banners.paymentPendingEnabled}
                  onCheckedChange={checked => handleToggleBanner('paymentPendingEnabled', checked)}
                />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>English</label>
                <Textarea
                  value={banners.paymentPendingText}
                  onChange={e => setBanners(prev => ({ ...prev, paymentPendingText: e.target.value }))}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>हिंदी</label>
                <Textarea
                  value={banners.paymentPendingTextHi}
                  onChange={e => setBanners(prev => ({ ...prev, paymentPendingTextHi: e.target.value }))}
                  maxLength={1000}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-3 border-t pt-5'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-bold text-[#0c2847]'>Allotment Letter Available Disclaimer</p>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-semibold text-muted-foreground'>
                  {banners.letterAvailableEnabled ? 'Shown' : 'Hidden'}
                </span>
                <Switch
                  checked={banners.letterAvailableEnabled}
                  onCheckedChange={checked => handleToggleBanner('letterAvailableEnabled', checked)}
                />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>English</label>
                <Textarea
                  value={banners.letterAvailableText}
                  onChange={e => setBanners(prev => ({ ...prev, letterAvailableText: e.target.value }))}
                  maxLength={1000}
                  rows={3}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-muted-foreground'>हिंदी</label>
                <Textarea
                  value={banners.letterAvailableTextHi}
                  onChange={e => setBanners(prev => ({ ...prev, letterAvailableTextHi: e.target.value }))}
                  maxLength={1000}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveBanners}
            disabled={isSavingBanners}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isSavingBanners ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <SaveIcon className='size-3.5 mr-1.5' />}
            Save Banners
          </Button>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Add Row</CardTitle>
          <CardDescription className='text-xs'>
            All six fields are required — the popup shows English or Hindi depending on the visitor&apos;s language choice.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-6'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <Input
              value={draft.particular}
              onChange={e => setDraft(prev => ({ ...prev, particular: e.target.value }))}
              placeholder='Particular (English)'
              maxLength={500}
            />
            <Input
              value={draft.particularHi}
              onChange={e => setDraft(prev => ({ ...prev, particularHi: e.target.value }))}
              placeholder='विवरण (हिंदी)'
              maxLength={500}
            />
            <Input
              value={draft.previous}
              onChange={e => setDraft(prev => ({ ...prev, previous: e.target.value }))}
              placeholder='Previous date/time (English)'
              maxLength={255}
            />
            <Input
              value={draft.previousHi}
              onChange={e => setDraft(prev => ({ ...prev, previousHi: e.target.value }))}
              placeholder='पूर्व तिथि (हिंदी)'
              maxLength={255}
            />
            <Input
              value={draft.revised}
              onChange={e => setDraft(prev => ({ ...prev, revised: e.target.value }))}
              placeholder='Revised date/time (English)'
              maxLength={255}
            />
            <Input
              value={draft.revisedHi}
              onChange={e => setDraft(prev => ({ ...prev, revisedHi: e.target.value }))}
              placeholder='संशोधित तिथि (हिंदी)'
              maxLength={255}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isCreating ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <PlusIcon className='size-3.5 mr-1.5' />}
            Add Row
          </Button>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Existing Rows ({rows.length})</CardTitle>
          <CardDescription className='text-xs'>Only active rows are shown in the popup, in this order.</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {rows.length === 0 && <p className='p-6 text-sm text-muted-foreground'>No rows yet.</p>}

            {rows.map((row, index) => {
              const isSaving = savingId === row.id

              return (
                <div key={row.id} className='flex flex-col gap-3 p-4 sm:flex-row sm:items-start'>
                  <div className='flex shrink-0 flex-row gap-1 sm:flex-col'>
                    <Button
                      type='button'
                      size='icon'
                      variant='outline'
                      disabled={index === 0}
                      onClick={() => handleReorder(index, 'up')}
                      className='size-7'
                    >
                      <ArrowUpIcon className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      size='icon'
                      variant='outline'
                      disabled={index === rows.length - 1}
                      onClick={() => handleReorder(index, 'down')}
                      className='size-7'
                    >
                      <ArrowDownIcon className='size-3.5' />
                    </Button>
                  </div>

                  <div className='grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2'>
                    <Input
                      value={row.particular}
                      onChange={e => handleFieldChange(row.id, 'particular', e.target.value)}
                      placeholder='Particular (English)'
                      className='text-sm'
                    />
                    <Input
                      value={row.particular_hi}
                      onChange={e => handleFieldChange(row.id, 'particular_hi', e.target.value)}
                      placeholder='विवरण (हिंदी)'
                      className='text-sm'
                    />
                    <Input
                      value={row.previous_text}
                      onChange={e => handleFieldChange(row.id, 'previous_text', e.target.value)}
                      placeholder='Previous (English)'
                      className='text-sm'
                    />
                    <Input
                      value={row.previous_text_hi}
                      onChange={e => handleFieldChange(row.id, 'previous_text_hi', e.target.value)}
                      placeholder='पूर्व तिथि (हिंदी)'
                      className='text-sm'
                    />
                    <Input
                      value={row.revised_text}
                      onChange={e => handleFieldChange(row.id, 'revised_text', e.target.value)}
                      placeholder='Revised (English)'
                      className='text-sm'
                    />
                    <Input
                      value={row.revised_text_hi}
                      onChange={e => handleFieldChange(row.id, 'revised_text_hi', e.target.value)}
                      placeholder='संशोधित तिथि (हिंदी)'
                      className='text-sm'
                    />
                  </div>

                  <div className='flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-semibold text-muted-foreground'>
                        {row.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <Switch checked={row.status === 'active'} onCheckedChange={() => handleToggleStatus(row)} disabled={isSaving} />
                    </div>
                    <Button
                      size='sm'
                      disabled={isSaving}
                      onClick={() => handleSaveRow(row)}
                      className='bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
                    >
                      {isSaving ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <SaveIcon className='size-3.5 mr-1.5' />}
                      Save
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={isSaving}
                      onClick={() => handleDelete(row)}
                      className='text-xs font-bold rounded-lg text-red-600 border-red-200 hover:bg-red-50'
                    >
                      <Trash2Icon className='size-3.5 mr-1.5' />
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
