'use client'

import { useState } from 'react'

import { AlertCircleIcon, ArrowDownIcon, ArrowUpIcon, CheckCircle2Icon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

type NoticeItem = {
  id: number
  text: string
  text_hi: string | null
  display_order: number
  status: 'active' | 'inactive'
}

export default function NoticesSettingsClient({ notices: initialNotices }: { notices: NoticeItem[] }) {
  const [notices, setNotices] = useState(initialNotices)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTextHi, setNewTextHi] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleFieldChange = (id: number, field: 'text' | 'text_hi', value: string) => {
    setNotices(prev => prev.map(n => (n.id === id ? { ...n, [field]: value } : n)))
  }

  const handleSaveText = async (notice: NoticeItem) => {
    setSavingId(notice.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/notices/${notice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: notice.text, textHi: notice.text_hi })
      })

      const data = await response.json()

      if (response.ok) {
        showSuccess('Notice saved.')
      } else {
        setErrorMessage(data.error ?? 'Failed to save notice.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleStatus = async (notice: NoticeItem) => {
    const nextStatus = notice.status === 'active' ? 'inactive' : 'active'

    setSavingId(notice.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/notices/${notice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      })

      if (response.ok) {
        setNotices(prev => prev.map(n => (n.id === notice.id ? { ...n, status: nextStatus } : n)))
        showSuccess(nextStatus === 'active' ? 'Notice activated.' : 'Notice deactivated.')
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

    if (targetIndex < 0 || targetIndex >= notices.length) return

    const a = notices[index]
    const b = notices[targetIndex]

    const reordered = [...notices]

    reordered[index] = { ...b, display_order: a.display_order }
    reordered[targetIndex] = { ...a, display_order: b.display_order }
    setNotices(reordered.sort((x, y) => x.display_order - y.display_order))

    setErrorMessage(null)

    try {
      await Promise.all([
        fetch(`/api/admin/notices/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: b.display_order })
        }),
        fetch(`/api/admin/notices/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: a.display_order })
        })
      ])
    } catch {
      setErrorMessage('Could not reorder notices. Please refresh and try again.')
    }
  }

  const handleDelete = async (notice: NoticeItem) => {
    if (!window.confirm('Delete this notice? This cannot be undone.')) return

    setSavingId(notice.id)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/admin/notices/${notice.id}`, { method: 'DELETE' })

      if (response.ok) {
        setNotices(prev => prev.filter(n => n.id !== notice.id))
        showSuccess('Notice deleted.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to delete notice.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreate = async () => {
    if (!newText.trim()) {
      setErrorMessage('Notice text (English) is required.')

      return
    }

    setIsCreating(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim(), textHi: newTextHi.trim() || null })
      })

      const data = await response.json()

      if (response.ok) {
        setNotices(prev => [
          ...prev,
          { id: data.id, text: newText.trim(), text_hi: newTextHi.trim() || null, display_order: prev.length + 1, status: 'active' }
        ])
        setNewText('')
        setNewTextHi('')
        showSuccess('Notice added.')
      } else {
        setErrorMessage(data.error ?? 'Failed to create notice.')
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
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Add Notice</CardTitle>
          <CardDescription className='text-xs'>English is required; Hindi is optional (falls back to English when Hindi is selected).</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-6'>
          <Textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder='Notice text (English)'
            rows={2}
            maxLength={512}
          />
          <Textarea
            value={newTextHi}
            onChange={e => setNewTextHi(e.target.value)}
            placeholder='सूचना पाठ (हिंदी) — optional'
            rows={2}
            maxLength={512}
          />
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isCreating ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <PlusIcon className='size-3.5 mr-1.5' />}
            Add Notice
          </Button>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Existing Notices ({notices.length})</CardTitle>
          <CardDescription className='text-xs'>Only active notices are shown on the public homepage ticker.</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {notices.length === 0 && <p className='p-6 text-sm text-muted-foreground'>No notices yet.</p>}

            {notices.map((notice, index) => {
              const isSaving = savingId === notice.id

              return (
                <div key={notice.id} className='flex flex-col gap-3 p-4 sm:flex-row sm:items-start'>
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
                      disabled={index === notices.length - 1}
                      onClick={() => handleReorder(index, 'down')}
                      className='size-7'
                    >
                      <ArrowDownIcon className='size-3.5' />
                    </Button>
                  </div>

                  <div className='flex flex-1 flex-col gap-2'>
                    <Textarea
                      value={notice.text}
                      onChange={e => handleFieldChange(notice.id, 'text', e.target.value)}
                      rows={2}
                      maxLength={512}
                      className='text-sm'
                    />
                    <Textarea
                      value={notice.text_hi ?? ''}
                      onChange={e => handleFieldChange(notice.id, 'text_hi', e.target.value)}
                      rows={2}
                      maxLength={512}
                      placeholder='हिंदी अनुवाद (वैकल्पिक)'
                      className='text-sm'
                    />
                  </div>

                  <div className='flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-semibold text-muted-foreground'>{notice.status === 'active' ? 'Active' : 'Inactive'}</span>
                      <Switch checked={notice.status === 'active'} onCheckedChange={() => handleToggleStatus(notice)} disabled={isSaving} />
                    </div>
                    <Button
                      size='sm'
                      disabled={isSaving}
                      onClick={() => handleSaveText(notice)}
                      className='bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
                    >
                      {isSaving ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <SaveIcon className='size-3.5 mr-1.5' />}
                      Save
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={isSaving}
                      onClick={() => handleDelete(notice)}
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
