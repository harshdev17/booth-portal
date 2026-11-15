'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  StoreIcon,
  UploadIcon
} from 'lucide-react'

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type RowError = { rowNumber: number; message: string }
type RowWarning = { rowNumber: number; message: string }

type InventoryPreviewRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  direction: string | null
  categoryName: string
  status: string
  stallAmountRupees?: number
  allotteeName?: string | null
  isDirectAllotment?: boolean
}

type ValidateResponse = {
  errors: RowError[]
  warnings?: RowWarning[]
  rowCount: number
  directAllottedCount?: number
  reservedPaymentCount?: number
  availableCount?: number
  previewRows?: InventoryPreviewRow[]
}

type ImportResponse = {
  errors: RowError[]
  warnings?: RowWarning[]
  rowCount: number
  inserted?: number
  updated?: number
  directAllotted?: number
  reservedForPayment?: number
  availableCount?: number
}

type Step = 'select' | 'validated' | 'importing' | 'done'

/**
 * "Download template → select file → validate & preview → import" wizard.
 * Supports standard shop unit imports as well as direct allotment.
 * Fixed viewport height constraints with responsive scrolling and pinned footer.
 */
const ImportInventoryDialog = ({ validCategoryNames }: { validCategoryNames: string[] }) => {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('select')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<RowError[]>([])
  const [warnings, setWarnings] = useState<RowWarning[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [previewRows, setPreviewRows] = useState<InventoryPreviewRow[]>([])
  const [directAllottedCount, setDirectAllottedCount] = useState(0)
  const [reservedPaymentCount, setReservedPaymentCount] = useState(0)
  const [availableCount, setAvailableCount] = useState(0)

  const [importSummary, setImportSummary] = useState<{
    inserted: number
    updated: number
    directAllotted: number
    reservedPayment: number
    available: number
  } | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const resetState = () => {
    setStep('select')
    setFile(null)
    setErrors([])
    setWarnings([])
    setRowCount(0)
    setPreviewRows([])
    setDirectAllottedCount(0)
    setReservedPaymentCount(0)
    setAvailableCount(0)
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
    setWarnings([])
    setPreviewRows([])

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
      setWarnings(body.warnings ?? [])
      setRowCount(body.rowCount)
      setPreviewRows(body.previewRows ?? [])
      setDirectAllottedCount(body.directAllottedCount ?? 0)
      setReservedPaymentCount(body.reservedPaymentCount ?? 0)
      setAvailableCount(body.availableCount ?? 0)
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

      setWarnings(body.warnings ?? [])
      setImportSummary({
        inserted: body.inserted ?? 0,
        updated: body.updated ?? 0,
        directAllotted: body.directAllotted ?? 0,
        reservedPayment: body.reservedForPayment ?? 0,
        available: body.availableCount ?? 0
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
        <UploadIcon className='size-4' />
        Import from CSV
      </DialogTrigger>
      <DialogContent className='sm:max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden'>
        <DialogHeader className='shrink-0 pb-2 border-b'>
          <DialogTitle className='text-base font-bold text-[#0c2847]'>Import Booth / Stall Inventory</DialogTitle>
          <DialogDescription className='text-xs'>
            Bulk-add, update stalls, or import direct allotments directly from a CSV file.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className='flex flex-col gap-4 overflow-y-auto pr-1 flex-1 min-h-0 py-2'>
          {/* Step 1: Template Download */}
          <div className='flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50/70 border border-slate-200 rounded-lg'>
            <div>
              <p className='text-xs font-bold text-slate-800 flex items-center gap-1.5'>
                <FileTextIcon className='size-3.5 text-blue-700' />
                1. Download Inventory CSV Template
              </p>
              <p className='text-[11px] text-muted-foreground mt-0.5'>
                Includes columns for Stall No, Single/Double, Category, Direction, Status &amp; Direct Allotments.
              </p>
            </div>
            <Button variant='outline' size='sm' className='text-xs h-8' render={<a href='/api/admin/inventory/template' />}>
              <DownloadIcon className='size-3.5 mr-1' />
              Download Template (.csv)
            </Button>
          </div>

          {/* Step 2: File Select */}
          <div className='flex flex-col gap-2'>
            <p className='text-xs font-bold text-slate-800 flex items-center gap-1.5'>
              <FileTextIcon className='size-3.5 text-blue-700' />
              2. Select Completed CSV File
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
              className='block w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-semibold'
            />
          </div>

          {/* Collapsible Active Categories Helper */}
          <details className='rounded-md border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700 group'>
            <summary className='font-bold cursor-pointer select-none flex items-center justify-between text-slate-800 text-[11px] uppercase tracking-wider'>
              <span>View Available Active Categories ({validCategoryNames.length})</span>
              <ChevronDownIcon className='size-3.5 group-open:rotate-180 transition-transform text-slate-500' />
            </summary>
            <div className='pt-2.5 space-y-2'>
              <ul className='flex flex-wrap gap-1.5'>
                {validCategoryNames.map(name => (
                  <li key={name} className='rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-800 shadow-2xs'>
                    {name}
                  </li>
                ))}
              </ul>
              <p className='text-[10px] text-muted-foreground'>
                Any other category name automatically creates a custom category for direct allotment. Re-uploading an updated file updates existing stalls.
              </p>
            </div>
          </details>

          {serverError && (
            <Alert variant='destructive' className='py-2.5'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription className='text-xs'>{serverError}</AlertDescription>
            </Alert>
          )}

          {step === 'validated' && errors.length > 0 && (
            <Alert variant='destructive' className='py-2.5'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription className='text-xs'>
                <p className='mb-1 font-bold'>{errors.length} row(s) have errors — fix and re-upload:</p>
                <ul className='max-h-32 space-y-0.5 overflow-y-auto text-xs list-disc pl-4'>
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
            <div className='flex flex-col gap-3'>
              <Alert className='border-emerald-200 bg-emerald-50 text-emerald-900 py-2.5'>
                <CheckCircle2Icon className='size-4 text-emerald-700' />
                <AlertDescription className='text-xs'>
                  <strong>{rowCount} row(s) validated successfully.</strong> Review the preview below before confirming import.
                </AlertDescription>
              </Alert>

              {/* Summary counters */}
              <div className='flex flex-wrap items-center gap-2'>
                <span className='rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 border'>
                  Total: {rowCount} Booths
                </span>
                {availableCount > 0 && (
                  <span className='rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800'>
                    {availableCount} Available
                  </span>
                )}
                {directAllottedCount > 0 && (
                  <span className='rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800'>
                    {directAllottedCount} Direct Allotted (Free)
                  </span>
                )}
                {reservedPaymentCount > 0 && (
                  <span className='rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800'>
                    {reservedPaymentCount} Reserved for Payment
                  </span>
                )}
              </div>

              {/* Preview Table */}
              {previewRows.length > 0 && (
                <div className='overflow-x-auto rounded-lg border border-slate-200 max-h-48 overflow-y-auto'>
                  <Table className='text-xs'>
                    <TableHeader className='bg-slate-50 sticky top-0 z-10'>
                      <TableRow className='text-[11px] font-bold uppercase'>
                        <TableHead className='w-10'>#</TableHead>
                        <TableHead>Booth/Stall</TableHead>
                        <TableHead>Type / Facing</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status / Allottee</TableHead>
                        <TableHead className='text-right'>Stall Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map(r => (
                        <TableRow key={r.rowNumber} className='hover:bg-slate-50/50'>
                          <TableCell className='font-mono text-muted-foreground'>{r.rowNumber}</TableCell>
                          <TableCell className='font-mono font-bold text-[#0c2847]'>Stall #{r.stallNumber}</TableCell>
                          <TableCell className='capitalize text-muted-foreground'>
                            {[r.shopType, r.direction ? `${r.direction} Facing` : null].filter(Boolean).join(' · ')}
                          </TableCell>
                          <TableCell>{r.categoryName}</TableCell>
                          <TableCell>
                            {r.isDirectAllotment && r.allotteeName ? (
                              <div>
                                <span className='font-bold text-slate-800'>{r.allotteeName}</span>
                                <span className='block text-[10px] text-purple-700 font-semibold'>Direct Allotment</span>
                              </div>
                            ) : (
                              <span className='capitalize font-medium text-slate-700'>{r.status.replaceAll('_', ' ')}</span>
                            )}
                          </TableCell>
                          <TableCell className='text-right font-medium'>
                            {r.stallAmountRupees !== undefined && r.stallAmountRupees !== null && r.stallAmountRupees > 0
                              ? `₹${r.stallAmountRupees.toLocaleString('en-IN')}`
                              : '₹0 (Free)'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {(step === 'validated' || step === 'done') && warnings.length > 0 && (
            <Alert className='border-amber-200 bg-amber-50 text-amber-900 py-2'>
              <AlertDescription className='text-xs'>
                <p className='font-semibold'>{warnings.length} row(s) will import, but have notices:</p>
                <ul className='max-h-24 space-y-0.5 overflow-y-auto text-[11px] list-disc pl-4 mt-1'>
                  {warnings.slice(0, 30).map((w, idx) => (
                    <li key={idx}>
                      Row {w.rowNumber}: {w.message}
                    </li>
                  ))}
                  {warnings.length > 30 && <li>…and {warnings.length - 30} more.</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {step === 'importing' && (
            <Alert className='py-3'>
              <Loader2Icon className='size-4 animate-spin text-blue-700' />
              <AlertDescription className='text-xs font-semibold'>
                Importing booths and stalls… please don&apos;t close this window.
              </AlertDescription>
            </Alert>
          )}

          {step === 'done' && importSummary && (
            <Alert className='border-emerald-200 bg-emerald-50 text-emerald-900 py-3'>
              <CheckCircle2Icon className='size-4 text-emerald-700' />
              <AlertDescription className='text-xs'>
                <div className='font-bold text-sm'>
                  Import complete — {importSummary.inserted} created, {importSummary.updated} updated.
                </div>
                <div className='mt-1.5 space-y-0.5 text-emerald-800 text-xs'>
                  {importSummary.directAllotted > 0 && <p>• {importSummary.directAllotted} stall(s) directly allotted (Free)</p>}
                  {importSummary.reservedPayment > 0 && <p>• {importSummary.reservedPayment} stall(s) reserved for payment</p>}
                  {importSummary.available > 0 && <p>• {importSummary.available} stall(s) available for draw/allotment</p>}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Fixed Pinned Footer */}
        <DialogFooter className='shrink-0 pt-3 border-t mt-auto flex items-center justify-between sm:justify-between w-full'>
          <Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={step === 'importing'}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </Button>

          <div className='flex items-center gap-2'>
            {step !== 'done' && step !== 'validated' && step !== 'importing' && (
              <Button type='button' disabled={!file || isLoading} onClick={handleValidate} className='bg-[#0c2847] text-white hover:bg-[#071a30]'>
                {isLoading && <Loader2Icon className='animate-spin size-4 mr-1' />}
                Validate &amp; Preview
              </Button>
            )}

            {step === 'validated' && errors.length === 0 && (
              <Button type='button' onClick={handleImport} className='bg-emerald-700 hover:bg-emerald-800 text-white font-bold'>
                <UploadIcon className='size-4 mr-1' />
                Confirm &amp; Import {rowCount} Stalls
              </Button>
            )}

            {step === 'validated' && errors.length > 0 && (
              <Button type='button' disabled={!file || isLoading} onClick={handleValidate} variant='outline'>
                {isLoading && <Loader2Icon className='animate-spin size-4 mr-1' />}
                Re-validate
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportInventoryDialog
