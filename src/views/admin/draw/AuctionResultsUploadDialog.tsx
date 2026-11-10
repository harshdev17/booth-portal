'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { CheckCircle2Icon, Loader2Icon, UploadIcon } from 'lucide-react'

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
type ImportResponse = { errors: RowError[]; rowCount: number; applicationNumbers?: string[] }

type Step = 'select' | 'validated' | 'importing' | 'done'

/**
 * "Select CSV → validate → import" wizard for the Admin's "Auction Results"
 * bulk upload — migration 0077's Auction Payment Flow, last manual step
 * after KDB's physical auction. Deliberately minimal (no template download,
 * no per-row preview) compared to ImportInventoryDialog.tsx — this upload
 * is small (one auction's worth of winners) and narrowly scoped to exactly
 * 3 columns (Application Number, Stall Number, Final Auction Amount), so
 * the richer wizard's complexity isn't warranted here.
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

  const runRequest = async (mode: 'validate' | 'import') => {
    if (!file) return

    setIsLoading(true)
    setServerError(null)
    setErrors([])

    try {
      const formData = new FormData()

      formData.append('mode', mode)
      formData.append('file', file)

      const response = await fetch('/api/admin/applications/auction-results', { method: 'POST', body: formData })
      const body: ValidateResponse | ImportResponse = await response.json()

      if (!response.ok) {
        setServerError('Something went wrong while processing the file.')
        setStep('select')

        return
      }

      if (body.errors.length > 0) {
        setErrors(body.errors)
        setStep('select')

        return
      }

      if (mode === 'validate') {
        setRowCount(body.rowCount)
        setStep('validated')
      } else {
        setImportedCount(body.rowCount)
        setStep('done')
        router.refresh()
      }
    } catch {
      setServerError('Could not reach the server. Please check your connection and try again.')
      setStep('select')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant='outline' />}>
        <UploadIcon />
        Upload Auction Results
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Upload Auction Results</DialogTitle>
          <DialogDescription>
            After the physical auction, upload a CSV of everyone who won a stall, with their specific final amount.
            Each matched application moves to &quot;Auction Won&quot; and is immediately sent a payment link for
            that amount.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div>
            <p className='mb-2 text-sm font-semibold text-slate-800'>
              Required columns: <span className='font-mono text-xs'>Application Number</span>,{' '}
              <span className='font-mono text-xs'>Stall Number</span>,{' '}
              <span className='font-mono text-xs'>Final Auction Amount</span>
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
              Only applications already &quot;Auction Fee Paid&quot; can be marked as winners — the physical auction
              is only open to applicants who completed that payment. Stalls must belong to the same category as the
              application.
            </p>
          </div>

          {serverError && (
            <Alert variant='destructive'>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {errors.length > 0 && (
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

          {step === 'done' && (
            <Alert className='border-emerald-200 bg-emerald-50 text-emerald-800'>
              <CheckCircle2Icon className='size-4' />
              <AlertDescription>
                {importedCount} application(s) marked as auction winners and sent their final payment link.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={step === 'importing'}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </Button>

          {step === 'select' && (
            <Button type='button' disabled={!file || isLoading} onClick={() => runRequest('validate')}>
              {isLoading && <Loader2Icon className='animate-spin' />}
              Validate
            </Button>
          )}

          {step === 'validated' && (
            <Button type='button' disabled={isLoading} onClick={() => runRequest('import')}>
              {isLoading && <Loader2Icon className='animate-spin' />}
              <UploadIcon />
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AuctionResultsUploadDialog
