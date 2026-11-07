'use client'

import { useRef, useState } from 'react'

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  ImageIcon,
  Loader2Icon,
  Trash2Icon,
  UploadIcon
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import type { NotificationFileRow } from '@/lib/settings/notification-files'

export default function NotificationBoardSettingsClient({ files: initialFiles }: { files: NotificationFileRow[] }) {
  const [files, setFiles] = useState(initialFiles)
  const [title, setTitle] = useState('')
  const [titleHi, setTitleHi] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]

    if (!title.trim()) {
      setErrorMessage('A title (English) is required.')

      return
    }

    if (!file) {
      setErrorMessage('Please choose a PDF, JPG, or PNG file.')

      return
    }

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()

      formData.set('title', title.trim())
      if (titleHi.trim()) formData.set('titleHi', titleHi.trim())
      formData.set('file', file)

      const response = await fetch('/api/admin/settings/notification-board', { method: 'POST', body: formData })
      const data = await response.json()

      if (response.ok) {
        setFiles(prev => [
          {
            id: data.id,
            title: title.trim(),
            titleHi: titleHi.trim() || null,
            filePath: data.filePath,
            fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
            originalFilename: file.name,
            displayOrder: prev.length + 1,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          ...prev
        ])
        setTitle('')
        setTitleHi('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        showSuccess('Notification uploaded.')
      } else {
        setErrorMessage(data.error ?? 'Failed to upload the file.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleToggleStatus = async (item: NotificationFileRow) => {
    const nextStatus = item.status === 'active' ? 'inactive' : 'active'

    setSavingId(item.id)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/settings/notification-board', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: nextStatus })
      })

      if (response.ok) {
        setFiles(prev => prev.map(f => (f.id === item.id ? { ...f, status: nextStatus } : f)))
        showSuccess(nextStatus === 'active' ? 'Shown on the public page.' : 'Hidden from the public page.')
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

  const handleDelete = async (item: NotificationFileRow) => {
    if (!window.confirm(`Remove "${item.title}"? This cannot be undone.`)) return

    setSavingId(item.id)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/settings/notification-board', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== item.id))
        showSuccess('Notification removed.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to remove the file.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
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
          <CardTitle className='text-base font-bold text-[#0c2847]'>Upload Notification</CardTitle>
          <CardDescription className='text-xs'>PDF, JPG, or PNG — max 15 MB. Shown on the public Notifications page, newest first.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-6'>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder='Title (English)' maxLength={191} />
          <Input value={titleHi} onChange={e => setTitleHi(e.target.value)} placeholder='शीर्षक (हिंदी) — optional' maxLength={191} />
          <Input ref={fileInputRef} type='file' accept='.pdf,.jpg,.jpeg,.png' />
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isUploading ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <UploadIcon className='size-3.5 mr-1.5' />}
            Upload
          </Button>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Uploaded Notifications ({files.length})</CardTitle>
          <CardDescription className='text-xs'>Only active items show on the public page.</CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {files.length === 0 && <p className='p-6 text-sm text-muted-foreground'>No notifications uploaded yet.</p>}

            {files.map(item => {
              const isSaving = savingId === item.id

              return (
                <div key={item.id} className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-center gap-3'>
                    {item.fileType === 'pdf' ? (
                      <FileIcon className='size-5 shrink-0 text-[#8c5711]' />
                    ) : (
                      <ImageIcon className='size-5 shrink-0 text-[#8c5711]' />
                    )}
                    <div>
                      <a
                        href={item.filePath}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm font-bold text-[#0c2847] hover:underline'
                      >
                        {item.title}
                      </a>
                      {item.titleHi && <p className='text-xs text-muted-foreground'>{item.titleHi}</p>}
                    </div>
                  </div>

                  <div className='flex shrink-0 items-center gap-3'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-semibold text-muted-foreground'>
                        {item.status === 'active' ? 'Shown' : 'Hidden'}
                      </span>
                      <Switch
                        checked={item.status === 'active'}
                        onCheckedChange={() => handleToggleStatus(item)}
                        disabled={isSaving}
                      />
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={isSaving}
                      onClick={() => handleDelete(item)}
                      className='text-xs font-bold rounded-lg text-red-600 border-red-200 hover:bg-red-50'
                    >
                      {isSaving ? <Loader2Icon className='size-3.5 animate-spin' /> : <Trash2Icon className='size-3.5' />}
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
