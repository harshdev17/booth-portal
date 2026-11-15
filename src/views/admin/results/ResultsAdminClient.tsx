'use client'

import { useRef, useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, FileTextIcon, Loader2Icon, SaveIcon, Trash2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type { ResultDocumentRow } from '@/lib/draw/result-documents'
import type { ResultsBannerSettings } from '@/lib/draw/results-declared'

export default function ResultsAdminClient({
  documents: initialDocuments,
  initialBanner
}: {
  documents: ResultDocumentRow[]
  initialBanner: ResultsBannerSettings
}) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [textEn, setTextEn] = useState(initialBanner.textEn)
  const [textHi, setTextHi] = useState(initialBanner.textHi)
  const [isSavingBanner, setIsSavingBanner] = useState(false)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]

    if (!file) {
      setErrorMessage('Please choose a PDF file.')

      return
    }

    setIsUploading(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()

      if (title.trim()) formData.set('title', title.trim())
      formData.set('file', file)

      const response = await fetch('/api/admin/results', { method: 'POST', body: formData })
      const data = await response.json()

      if (response.ok) {
        setDocuments(prev => [
          {
            id: data.id,
            title: title.trim() || null,
            filePath: data.filePath,
            originalFilename: file.name,
            createdAt: new Date().toISOString()
          },
          ...prev
        ])
        setTitle('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        showSuccess('Result document uploaded.')
      } else {
        setErrorMessage(data.error ?? 'Failed to upload the file.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (item: ResultDocumentRow) => {
    if (!window.confirm(`Remove "${item.title || item.originalFilename}"? This cannot be undone.`)) return

    setDeletingId(item.id)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/results', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id })
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== item.id))
        showSuccess('Result document removed.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to remove the file.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveBanner = async () => {
    if (!textEn.trim() || !textHi.trim()) {
      setErrorMessage('Both English and Hindi banner text are required.')

      return
    }

    setIsSavingBanner(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/results-banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textEn: textEn.trim(), textHi: textHi.trim() })
      })

      if (response.ok) {
        showSuccess('Banner text updated.')
      } else {
        const data = await response.json()

        setErrorMessage(data.error ?? 'Failed to update the banner text.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsSavingBanner(false)
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
          <CardTitle className='text-base font-bold text-[#0c2847]'>
            &quot;Results Declared&quot; Banner Message
          </CardTitle>
          <CardDescription className='text-xs'>
            Shown automatically on the homepage and status page once any category&apos;s draw is marked complete —
            no separate publish step needed. Edit the wording here any time.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-6'>
          <Textarea value={textEn} onChange={e => setTextEn(e.target.value)} placeholder='Banner text (English)' rows={2} />
          <Textarea value={textHi} onChange={e => setTextHi(e.target.value)} placeholder='बैनर टेक्स्ट (हिंदी)' rows={2} />
          <Button
            onClick={handleSaveBanner}
            disabled={isSavingBanner}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isSavingBanner ? (
              <Loader2Icon className='size-3.5 animate-spin mr-1.5' />
            ) : (
              <SaveIcon className='size-3.5 mr-1.5' />
            )}
            Save Banner Text
          </Button>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Upload Result PDF</CardTitle>
          <CardDescription className='text-xs'>Any PDF, max 15 MB. Immediately downloadable from the public Results page.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3 pt-6'>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder='Title (optional)' maxLength={191} />
          <Input ref={fileInputRef} type='file' accept='.pdf' />
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
          <CardTitle className='text-base font-bold text-[#0c2847]'>Uploaded Results ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {documents.length === 0 && <p className='p-6 text-sm text-muted-foreground'>No result documents uploaded yet.</p>}

            {documents.map(item => {
              const isDeleting = deletingId === item.id

              return (
                <div key={item.id} className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='flex items-center gap-3'>
                    <FileTextIcon className='size-5 shrink-0 text-[#8c5711]' />
                    <div>
                      <a
                        href={item.filePath}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm font-bold text-[#0c2847] hover:underline'
                      >
                        {item.title || item.originalFilename}
                      </a>
                      <p className='text-xs text-muted-foreground'>
                        {new Date(item.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <Button
                    size='sm'
                    variant='outline'
                    disabled={isDeleting}
                    onClick={() => handleDelete(item)}
                    className='w-fit text-xs font-bold rounded-lg text-red-600 border-red-200 hover:bg-red-50'
                  >
                    {isDeleting ? <Loader2Icon className='size-3.5 animate-spin' /> : <Trash2Icon className='size-3.5' />}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
