'use client'

import { useRef, useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, Trash2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { CategoryMapRow, CategoryWithOptionalMap } from '@/lib/settings/category-maps'

type Row = {
  key: string
  label: string
  categoryId: number | null
  pdfPath: string | null
  originalFilename: string | null
}

const UploadRow = ({
  row,
  onUploaded,
  onRequestRemove,
  isRemoving
}: {
  row: Row
  onUploaded: (pdfPath: string) => void
  onRequestRemove: () => void
  isRemoving: boolean
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()

      formData.set('file', file)
      formData.set('categoryId', row.categoryId === null ? 'null' : String(row.categoryId))

      const response = await fetch('/api/admin/settings/maps', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Upload failed.')

        return
      }

      onUploaded(data.pdfPath)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsUploading(false)

      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className='flex flex-col gap-2 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <p className='font-semibold text-[#0c2847]'>{row.label}</p>
        {row.pdfPath ? (
          <a href={row.pdfPath} target='_blank' rel='noopener noreferrer' className='text-xs text-blue-700 hover:underline'>
            {row.originalFilename ?? row.pdfPath}
          </a>
        ) : (
          <p className='text-xs text-muted-foreground'>No map uploaded yet — the "View Stall/Booth Location" button stays hidden.</p>
        )}
        {error && <p className='mt-1 text-xs text-destructive'>{error}</p>}
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <input
          ref={inputRef}
          type='file'
          accept='application/pdf,image/jpeg,image/png'
          className='hidden'
          onChange={handleFileChange}
        />
        <Button type='button' variant='outline' size='sm' disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2Icon className='size-4 animate-spin' /> : <UploadIcon className='size-4' />}
          {row.pdfPath ? 'Replace File' : 'Upload File'}
        </Button>
        {row.pdfPath && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={isRemoving}
            onClick={onRequestRemove}
            className='text-destructive hover:text-destructive'
          >
            {isRemoving ? <Loader2Icon className='size-4 animate-spin' /> : <Trash2Icon className='size-4' />}
            Remove
          </Button>
        )}
      </div>
    </div>
  )
}

const CategoryMapsSettingsClient = ({
  fullMap,
  categories
}: {
  fullMap: CategoryMapRow | null
  categories: CategoryWithOptionalMap[]
}) => {
  const [fullMapPath, setFullMapPath] = useState(fullMap?.pdfPath ?? null)
  const [categoryPaths, setCategoryPaths] = useState<Record<number, string>>(
    Object.fromEntries(categories.filter(c => c.pdfPath).map(c => [c.categoryId, c.pdfPath as string]))
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Replaces window.confirm() with the project's own Dialog component,
  // matching CategoryFeeSettingsClient's confirm-dialog pattern — a browser
  // native confirm() popup looked out of place next to the rest of the
  // admin panel (reported live).
  const [removeTarget, setRemoveTarget] = useState<{ categoryId: number | null; label: string } | null>(null)

  const announce = (message = 'Map updated.') => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const confirmRemove = async () => {
    if (!removeTarget) return

    setIsRemoving(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/settings/maps', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: removeTarget.categoryId })
      })
      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error ?? 'Failed to remove the map.')

        return
      }

      if (removeTarget.categoryId === null) {
        setFullMapPath(null)
      } else {
        const targetId = removeTarget.categoryId

        setCategoryPaths(prev => {
          const next = { ...prev }

          delete next[targetId]

          return next
        })
      }

      announce('Map removed.')
      setRemoveTarget(null)
    } catch {
      setErrorMessage('Could not reach the server. Please try again.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {successMessage && (
        <Alert className='border-green-200 bg-green-50 text-green-800'>
          <CheckCircle2Icon className='size-4' />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant='destructive'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Full Map</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadRow
            row={{
              key: 'full-map',
              label: 'Full Venue Map',
              categoryId: null,
              pdfPath: fullMapPath,
              originalFilename: fullMap?.originalFilename ?? null
            }}
            onUploaded={pdfPath => {
              setFullMapPath(pdfPath)
              announce()
            }}
            onRequestRemove={() => setRemoveTarget({ categoryId: null, label: 'Full Venue Map' })}
            isRemoving={isRemoving && removeTarget?.categoryId === null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Category-wise Maps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col'>
            {categories.map(cat => (
              <UploadRow
                key={cat.categoryId}
                row={{
                  key: String(cat.categoryId),
                  label: cat.categoryName,
                  categoryId: cat.categoryId,
                  pdfPath: categoryPaths[cat.categoryId] ?? null,
                  originalFilename: cat.originalFilename
                }}
                onUploaded={pdfPath => {
                  setCategoryPaths(prev => ({ ...prev, [cat.categoryId]: pdfPath }))
                  announce()
                }}
                onRequestRemove={() => setRemoveTarget({ categoryId: cat.categoryId, label: cat.categoryName })}
                isRemoving={isRemoving && removeTarget?.categoryId === cat.categoryId}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={removeTarget !== null} onOpenChange={open => !open && !isRemoving && setRemoveTarget(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Remove Map</DialogTitle>
            <DialogDescription>
              Remove the map for &ldquo;{removeTarget?.label}&rdquo;? The &ldquo;View Stall/Booth Location&rdquo; button will
              stop showing wherever it&apos;s used (Apply page, category detail, Guidelines) until a map is uploaded again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setRemoveTarget(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button type='button' variant='destructive' onClick={confirmRemove} disabled={isRemoving}>
              {isRemoving ? <Loader2Icon className='size-4 animate-spin' /> : <Trash2Icon className='size-4' />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CategoryMapsSettingsClient
