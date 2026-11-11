'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { CheckCircle2Icon, DownloadIcon, FileTextIcon, GavelIcon, Loader2Icon, UploadIcon } from 'lucide-react'

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

type ApiResponse = {
  errors: RowError[]
  rowCount: number
  imported?: boolean
  error?: string
}

type Step = 'select' | 'validated' | 'importing' | 'done'

/**
 * "Download template → select file → validate → import" wizard for an
 * auction category's physical-auction results (mirrors
 * ImportInventoryDialog.tsx's wizard shape). One row per winner —
 * Application Number, Stall Number, Final Auction Amount — the final amount
 * genuinely varies per winner, decided at the in-person auction, so it's
 * supplied here rather than configured ahead of time anywhere.
 */
const AuctionResultsUploadDialog = () => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const resetState = () => {
    setStep('select')
    setFile(null)
    setErrors([])
    setRowCount(0)
    setImportedCount(0)
    setServerError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetState()
  }

  const submit = async (mode: 'validate' | 'import') => {
    if (!file) return null

    const formData = new FormData()

    formData.append('mode', mode)
    formData.append('file', file)

    const response = await fetch('/api/admin/applications/auction-results', { method: 'POST', body: formData })
    const body: ApiResponse = await response.json()

    return { ok: response.ok, body }
  }

  const handleValidate = async () => {
    setIsLoading(true)
    setServerError(null)
    setErrors([])

    try {
      const result = await submit('validate')

      if (!result || !result.ok) {
        setServerError(result?.body.error ?? 'Something went wrong while validating the file.')

        return
      }

      setErrors(result.body.errors)
      setRowCount(result.body.rowCount)
      setStep('validated')
    } catch {
      setServerError('Could not reach the server. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    setStep('importing')
    setServerError(null)

    try {
      const result = await submit('import')

      if (!result || !result.ok || result.body.errors.length > 0) {
        setErrors(result?.body.errors ?? [])
        setServerError(result?.body.errors.length ? null : (result?.body.error ?? 'Something went wrong while importing the file.'))
        setStep('validated')

        return
      }

      setImportedCount(result.body.rowCount)
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
        <GavelIcon />
        Upload Auction Results
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Upload Auction Results</DialogTitle>
          <DialogDescription>
            After the physical auction, record who won which stall and their final amount — each winner is moved to
            &ldquo;Auction Won&rdquo; and sent a payment link for their exact amount.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-5'>
          <div>
            <p className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800'>
              <FileTextIcon className='size-4' /> 1. Download the template and fill in one row per winner.
            </p>
            <Button variant='outline' size='sm' render={<a href='/api/admin/applications/auction-results/template' />}>
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
              Columns: Application Number, Stall Number, Final Auction Amount. Only applications currently &ldquo;Auction
              Fee Paid&rdquo; are matched (re-uploading a file for an already-recorded winner is safe and just updates
              their amount). Max 500 rows, 2 MB.
            </p>
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

          {step === 'done' && (
            <Alert className='border-emerald-200 bg-emerald-50 text-emerald-800'>
              <CheckCircle2Icon className='size-4' />
              <AlertDescription>
                {importedCount} winner(s) recorded. Each was moved to &ldquo;Auction Won&rdquo; and sent a payment link for
                their final amount.
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AuctionResultsUploadDialog
