'use client'

import { useRef, useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CategoryMapRow, CategoryWithOptionalMap } from '@/lib/settings/category-maps'

type Row = {
  key: string
  label: string
  categoryId: number | null
  pdfPath: string | null
  originalFilename: string | null
}

const UploadRow = ({ row, onUploaded }: { row: Row; onUploaded: (pdfPath: string) => void }) => {
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
          <p className='text-xs text-muted-foreground'>No map uploaded yet.</p>
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

  const announce = () => {
    setSuccessMessage('Map updated.')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  return (
    <div className='flex flex-col gap-6'>
      {successMessage && (
        <Alert className='border-green-200 bg-green-50 text-green-800'>
          <CheckCircle2Icon className='size-4' />
          <AlertDescription>{successMessage}</AlertDescription>
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
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CategoryMapsSettingsClient
