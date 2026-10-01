'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { CheckCircle2Icon, DownloadIcon, FileTextIcon, Loader2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

type RowError = { rowNumber: number; message: string }

type ValidateResponse = { errors: RowError[]; rowCount: number }
type ImportResponse = { errors: RowError[]; rowCount: number; inserted?: number; updated?: number; skippedAllotted?: number }

type Step = 'select' | 'validated' | 'importing' | 'done'

/**
 * "Download template → select file → validate → import" wizard, matching
 * the reference UI pattern given (a timesheet-style bulk-import dialog).
 * Validation is a separate server round-trip from import (never the same
 * call) so the admin sees every row error before anything is written — see
 * /api/admin/inventory/import's `mode: 'validate' | 'import'`.
 */
const ImportInventoryDialog = ({ validCategoryNames }: { validCategoryNames: string[] }) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [rowCount, setRowCount] = useState(0)

  const [importSummary, setImportSummary] = useState<{ inserted: number; updated: number; skippedAllotted: number } | null>(
    null
  )

  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const resetState = () => {
    setStep('select')
    setFile(null)
    setErrors([])
    setRowCount(0)
    setImportSummary(null)
    setServerError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetState()
  }

  const handleValidate = async () => {
    if (!file) return

    setIsLoading(true)
    setServerError(null)
    setErrors([])

    try {
      const formData = new FormData()

      formData.append('mode', 'validate')
      formData.append('file', file)

      const response = await fetch('/api/admin/inventory/import', { method: 'POST', body: formData })
      const body: ValidateResponse = await response.json()

      if (!response.ok) {
        setServerError('Something went wrong while validating the file.')

        return
      }

      setErrors(body.errors)
      setRowCount(body.rowCount)
      setStep('validated')
    } catch {
      setServerError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setStep('importing')
    setServerError(null)

    try {
      const formData = new FormData()

      formData.append('mode', 'import')
      formData.append('file', file)

      const response = await fetch('/api/admin/inventory/import', { method: 'POST', body: formData })
      const body: ImportResponse = await response.json()

      if (!response.ok || body.errors.length > 0) {
        setErrors(body.errors)
        setServerError(body.errors.length > 0 ? null : 'Something went wrong while importing the file.')
        setStep('validated')

        return
      }

      setImportSummary({
        inserted: body.inserted ?? 0,
        updated: body.updated ?? 0,
        skippedAllotted: body.skippedAllotted ?? 0
      })
      setStep('done')
      router.refresh()
    } catch {
      setServerError('Could not reach the server. Please check your connection and try again.')
      setStep('validated')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant='outline' />}>
        <UploadIcon />
        Import from CSV
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Import Shop Inventory</DialogTitle>
          <DialogDescription>Bulk-add or update stall numbers from a CSV file.</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-5'>
          <div>
            <p className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
              <FileTextIcon className='size-4' /> 1. Download the import template and fill in your stall rows.
            </p>
            <Button variant='outline' size='sm' render={<a href='/api/admin/inventory/template' />}>
              <DownloadIcon />
              Download Template (.csv)
            </Button>
          </div>

          <div className='border-t pt-4'>
            <p className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
              <FileTextIcon className='size-4' /> 2. Select the completed file to validate.
            </p>
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv'
              disabled={step === 'importing'}
              onChange={e => {
                const selected = e.target.files?.[0] ?? null

                setFile(selected)
                setStep('select')
                setErrors([])
                setServerError(null)
              }}
              className='block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-semibold'
            />
            <p className='mt-2 text-xs text-muted-foreground'>
              Supported: .csv · Max 10 MB · Header row required · Stall No., Single/Double, Category, Direction, EMD Amount
              (optional)
            </p>
          </div>

          <div className='rounded-md border bg-muted/30 p-3'>
            <p className='mb-1.5 text-xs font-bold text-slate-700'>
              The Category column must match one of these exactly (case-insensitive):
            </p>
            <ul className='flex flex-wrap gap-1.5'>
              {validCategoryNames.map(name => (
                <li key={name} className='rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 shadow-2xs'>
                  {name}
                </li>
              ))}
            </ul>
          </div>

          {serverError && (
            <Alert variant='destructive'>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {step === 'validated' && errors.length > 0 && (
            <Alert variant='destructive'>
              <AlertDescription>
                <p className='mb-1.5 font-semibold'>{errors.length} row(s) have errors — fix and re-upload:</p>
                <ul className='max-h-40 space-y-0.5 overflow-y-auto text-xs'>
                  {errors.slice(0, 30).map((err, idx) => (
                    <li key={idx}>
                      Row {err.rowNumber}: {err.message}
                    </li>
                  ))}
                  {errors.length > 30 && <li>…and {errors.length - 30} more.</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {step === 'validated' && errors.length === 0 && (
            <Alert className='border-emerald-200 bg-emerald-50 text-emerald-800'>
              <CheckCircle2Icon className='size-4' />
              <AlertDescription>{rowCount} row(s) validated successfully. Ready to import.</AlertDescription>
            </Alert>
          )}

          {step === 'importing' && (
            <Alert>
              <Loader2Icon className='size-4 animate-spin' />
              <AlertDescription>Importing… please don&apos;t close this window.</AlertDescription>
            </Alert>
          )}

          {step === 'done' && importSummary && (
            <Alert className='border-emerald-200 bg-emerald-50 text-emerald-800'>
              <CheckCircle2Icon className='size-4' />
              <AlertDescription>
                Import complete — {importSummary.inserted} added, {importSummary.updated} updated
                {importSummary.skippedAllotted > 0 && `, ${importSummary.skippedAllotted} skipped (already allotted)`}.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={step === 'importing'}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </Button>

          {step !== 'done' && step !== 'validated' && step !== 'importing' && (
            <Button type='button' disabled={!file || isLoading} onClick={handleValidate}>
              {isLoading && <Loader2Icon className='animate-spin' />}
              Validate
            </Button>
          )}

          {step === 'validated' && errors.length === 0 && (
            <Button type='button' onClick={handleImport}>
              <UploadIcon />
              Import
            </Button>
          )}

          {step === 'importing' && (
            <Button type='button' disabled>
              <Loader2Icon className='animate-spin' />
              Importing…
            </Button>
          )}

          {step === 'validated' && errors.length > 0 && (
            <Button type='button' disabled={!file || isLoading} onClick={handleValidate}>
              {isLoading && <Loader2Icon className='animate-spin' />}
              Re-validate
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportInventoryDialog
