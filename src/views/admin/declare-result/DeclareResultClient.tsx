'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { AlertCircleIcon, CheckCircle2Icon, ChevronDownIcon, ChevronUpIcon, DownloadIcon, HistoryIcon, Loader2Icon, MegaphoneIcon, PencilIcon, Trash2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ResultHistoryEntry, ResultRowView, ResultSheetPreview } from '@/lib/allotment/declare-result'

type RowError = { rowNumber: number; message: string }

type Props = {
  drawPending: ResultRowView[]
  drawDeclared: ResultRowView[]
  auctionPending: ResultRowView[]
  auctionDeclared: ResultRowView[]
  history: ResultHistoryEntry[]
  tableMissing: boolean
}

type ResultPurpose = 'draw_allotment' | 'auction_result'

const HISTORY_LABELS: Record<string, string> = {
  'result.sheet_uploaded': 'Sheet uploaded',
  'result.row_updated': 'Row changed',
  'result.row_removed': 'Row removed',
  'result.declared': 'Result declared'
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

function describeHistoryEntry(entry: ResultHistoryEntry): string {
  const prev = asRecord(entry.previousValue)
  const next = asRecord(entry.newValue)

  switch (entry.action) {
    case 'result.sheet_uploaded':
      return `${next.rowCount ?? '?'} row(s) from "${next.filename ?? 'sheet'}"${Number(next.createdStalls) > 0 ? `, ${next.createdStalls} new booth(s) added` : ''}`
    case 'result.row_updated':
      return `Booth ${next.stall ?? prev.stall ?? '?'}: ${prev.applicationNumber ?? '?'} → ${next.applicationNumber ?? '?'}`
    case 'result.row_removed':
      return `Booth ${prev.stall ?? '?'} (${prev.applicationNumber ?? '?'}) removed from the pending sheet`
    case 'result.declared':
      return `${next.declaredCount ?? '?'} booth(s) declared (${next.paymentRequiredCount ?? 0} with Pay Now link)`
    default:
      return entry.action
  }
}

const HistoryEntryItem = ({ entry }: { entry: ResultHistoryEntry }) => {
  const [expanded, setExpanded] = useState(false)
  const hasStalls = Boolean(entry.stalls && entry.stalls.length > 0)
  const diff = entry.diff

  return (
    <li className='rounded-md border bg-white px-3.5 py-2.5 text-sm transition'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='font-semibold text-[#0c2847]'>{HISTORY_LABELS[entry.action] ?? entry.action}</span>
          {entry.action === 'result.sheet_uploaded' && (
            <span className='rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200'>
              Upload
            </span>
          )}
          {entry.action === 'result.declared' && (
            <span className='rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200'>
              Declared
            </span>
          )}
          {entry.action === 'result.row_updated' && (
            <span className='rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200'>
              Edited
            </span>
          )}
          {entry.action === 'result.row_removed' && (
            <span className='rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-800 border border-red-200'>
              Removed
            </span>
          )}
        </div>
        <span className='text-xs text-muted-foreground'>
          {entry.actorName ?? 'System'} · {formatHistoryTime(entry.createdAt)}
        </span>
      </div>

      <p className='mt-1 text-xs text-slate-700 font-medium'>{describeHistoryEntry(entry)}</p>

      {/* Highlights: What was added, updated, or created in this sheet */}
      {diff && (
        <div className='mt-2 flex flex-col gap-1.5'>
          {/* New booths created in inventory */}
          {diff.newBoothsCreated && diff.newBoothsCreated.length > 0 && (
            <div className='flex flex-wrap items-center gap-1.5 text-xs'>
              <span className='rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-300'>
                ✨ {diff.newBoothsCreated.length} New Booth(s) Created in Inventory:
              </span>
              <span className='font-mono font-bold text-emerald-900'>
                {diff.newBoothsCreated.join(', ')}
              </span>
            </div>
          )}

          {/* Added to Sheet */}
          {diff.addedBooths && diff.addedBooths.length > 0 && (
            <div className='rounded bg-emerald-50/70 border border-emerald-200 p-2 text-xs'>
              <span className='font-bold text-emerald-900 block mb-1'>
                + Added to Sheet ({diff.addedBooths.length} booth{diff.addedBooths.length > 1 ? 's' : ''}):
              </span>
              <div className='flex flex-wrap gap-1.5'>
                {diff.addedBooths.map(b => (
                  <span
                    key={b.stall}
                    className='rounded bg-white px-2 py-0.5 border border-emerald-200 font-mono text-[11px] text-emerald-950'
                  >
                    Booth <strong className='text-[#0c2847]'>{b.stall}</strong> → {b.applicationNumber}
                    {b.applicantName ? ` (${b.applicantName})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Changed / Updated in Sheet */}
          {diff.changedBooths && diff.changedBooths.length > 0 && (
            <div className='rounded bg-amber-50/70 border border-amber-200 p-2 text-xs'>
              <span className='font-bold text-amber-900 block mb-1'>
                ~ Application Changed for Booths ({diff.changedBooths.length}):
              </span>
              <div className='flex flex-col gap-1'>
                {diff.changedBooths.map(c => (
                  <div key={c.stall} className='text-[11px] text-amber-950'>
                    Booth <strong className='font-mono text-[#0c2847]'>{c.stall}</strong>:{' '}
                    <span className='line-through text-slate-400'>{c.oldApp}</span> →{' '}
                    <strong className='text-[#0c2847]'>{c.newApp}</strong>
                    {c.newName ? ` (${c.newName})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed from Sheet */}
          {diff.removedBooths && diff.removedBooths.length > 0 && (
            <div className='rounded bg-red-50/70 border border-red-200 p-2 text-xs'>
              <span className='font-bold text-red-900 block mb-1'>
                - Removed from Sheet ({diff.removedBooths.length} booth{diff.removedBooths.length > 1 ? 's' : ''}):
              </span>
              <div className='flex flex-wrap gap-1.5'>
                {diff.removedBooths.map(b => (
                  <span
                    key={b.stall}
                    className='rounded bg-white px-2 py-0.5 border border-red-200 font-mono text-[11px] text-red-950'
                  >
                    Booth <strong>{b.stall}</strong> ({b.applicationNumber})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expandable toggle to view all booths in this upload/declaration */}
      {hasStalls && (
        <div className='mt-2.5 pt-2 border-t border-slate-100'>
          <button
            type='button'
            onClick={() => setExpanded(!expanded)}
            className='inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition'
          >
            {expanded ? (
              <>
                <ChevronUpIcon className='size-3.5' /> Hide booth details ({entry.stalls!.length})
              </>
            ) : (
              <>
                <ChevronDownIcon className='size-3.5' /> View all booths in this{' '}
                {entry.action === 'result.declared' ? 'declaration' : 'sheet'} ({entry.stalls!.length})
              </>
            )}
          </button>

          {expanded && (
            <div className='mt-2 overflow-x-auto rounded border border-slate-200 bg-slate-50/50 p-2'>
              <table className='w-full text-left text-xs'>
                <thead>
                  <tr className='border-b text-slate-500 font-semibold'>
                    <th className='pb-1 pr-2'>Booth</th>
                    <th className='pb-1 pr-2'>Application No.</th>
                    <th className='pb-1 pr-2'>Applicant</th>
                    <th className='pb-1 pr-2'>Category</th>
                    <th className='pb-1 text-right'>Allocation / Fee</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {entry.stalls!.map((s, idx) => (
                    <tr key={idx} className='hover:bg-white/80 transition'>
                      <td className='py-1 pr-2 font-mono font-bold text-[#0c2847]'>{s.stall}</td>
                      <td className='py-1 pr-2 font-mono text-slate-700'>{s.applicationNumber}</td>
                      <td className='py-1 pr-2 font-medium text-slate-800'>{s.applicantName || '—'}</td>
                      <td className='py-1 pr-2 text-slate-500'>{s.categoryName || '—'}</td>
                      <td className='py-1 text-right'>
                        {s.isPaymentRequired !== undefined && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              s.isPaymentRequired ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.isPaymentRequired ? 'Payment Required' : 'Allotted'}
                          </span>
                        )}
                        {s.isNewStall && (
                          <span className='ml-1 rounded bg-blue-100 px-1 py-0.5 text-[9px] font-bold text-blue-800'>
                            New Booth
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

const formatHistoryTime = (value: string) => new Date(value.replace(' ', 'T') + '+05:30').toLocaleString('en-IN')

type RowActions = {
  onEdit: (row: ResultRowView) => void
  onRemove: (row: ResultRowView) => void
  busyRowId: number | null
}

const ResultTable = ({ rows, showDeclaredAt, actions }: { rows: ResultRowView[]; showDeclaredAt?: boolean; actions?: RowActions }) => (
  <div className='overflow-x-auto rounded-lg border'>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Booth/Stall No.</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Application No.</TableHead>
          <TableHead>Applicant</TableHead>
          <TableHead>Stall Amount</TableHead>
          <TableHead>{showDeclaredAt ? 'Status' : 'On Declare'}</TableHead>
          {showDeclaredAt && <TableHead>Declared</TableHead>}
          {actions && <TableHead className='text-right'>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.id}>
            <TableCell className='font-mono font-bold text-[#0c2847]'>{row.stallNumber}</TableCell>
            <TableCell className='capitalize'>{row.shopType}</TableCell>
            <TableCell>{row.categoryName}</TableCell>
            <TableCell className='font-mono text-xs'>{row.applicationNumber}</TableCell>
            <TableCell>{row.applicantName}</TableCell>
            <TableCell className='text-xs'>
              {/* Only shown when the category actually charges for this stall —
                  a category with payment NOT enabled can still have a leftover/
                  unrelated allotment_amount_paise value configured, which must
                  never be displayed here as if it were being charged. */}
              {row.paymentRequired && row.allotmentAmountPaise
                ? `₹${(row.allotmentAmountPaise / 100).toLocaleString('en-IN')}`
                : '—'}
            </TableCell>
            <TableCell className='text-xs'>
              {showDeclaredAt
                ? row.applicationStatus.replace(/_/g, ' ')
                : row.purpose === 'auction_result'
                  ? 'Auction Won + Final Payment link'
                  : row.paymentRequired
                    ? 'Payment Required + Pay Now link'
                    : 'Allotted'}
            </TableCell>
            {showDeclaredAt && (
              <TableCell className='text-xs text-muted-foreground'>
                {row.declaredAt ? new Date(row.declaredAt.replace(' ', 'T') + '+05:30').toLocaleString('en-IN') : '—'}
              </TableCell>
            )}
            {actions && (
              <TableCell className='text-right'>
                <div className='inline-flex gap-1'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    disabled={actions.busyRowId === row.id}
                    onClick={() => actions.onEdit(row)}
                  >
                    <PencilIcon className='size-3.5' />
                    Edit
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='text-red-600 hover:text-red-700'
                    disabled={actions.busyRowId === row.id}
                    onClick={() => actions.onRemove(row)}
                  >
                    {actions.busyRowId === row.id ? <Loader2Icon className='size-3.5 animate-spin' /> : <Trash2Icon className='size-3.5' />}
                    Remove
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)

const DeclareResultClient = ({ drawPending, drawDeclared, auctionPending, auctionDeclared, history, tableMissing }: Props) => {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [purpose, setPurpose] = useState<ResultPurpose>('draw_allotment')
  const pending = purpose === 'auction_result' ? auctionPending : drawPending
  const declared = purpose === 'auction_result' ? auctionDeclared : drawDeclared
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<RowError[]>([])
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Sheet preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<(ResultSheetPreview & { filename: string }) | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeclaring, setIsDeclaring] = useState(false)
  const [declareError, setDeclareError] = useState<string | null>(null)
  const [declareProblems, setDeclareProblems] = useState<string[]>([])
  const [declareSuccess, setDeclareSuccess] = useState<string | null>(null)

  const batchId = pending[0]?.batchId ?? null
  const paymentCount = pending.filter(r => r.paymentRequired).length

  // Row edit/remove state (pending sheet only)
  const [busyRowId, setBusyRowId] = useState<number | null>(null)
  const [rowActionError, setRowActionError] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<ResultRowView | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const removeRow = async (row: ResultRowView) => {
    if (!window.confirm(`Remove booth ${row.stallNumber} (${row.applicationNumber}) from the pending result?`)) return

    setBusyRowId(row.id)
    setRowActionError(null)

    try {
      const response = await fetch(`/api/admin/declare-result/rows?rowId=${row.id}`, { method: 'DELETE' })
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setRowActionError(body.error ?? 'Could not remove the row.')

        return
      }

      router.refresh()
    } catch {
      setRowActionError('Could not reach the server. Please try again.')
    } finally {
      setBusyRowId(null)
    }
  }

  const saveEdit = async () => {
    if (!editingRow) return

    setIsSavingEdit(true)
    setEditError(null)

    try {
      const response = await fetch('/api/admin/declare-result/rows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId: editingRow.id, applicationNumber: editValue })
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setEditError(body.error ?? 'Could not change the row.')

        return
      }

      setEditingRow(null)
      router.refresh()
    } catch {
      setEditError('Could not reach the server. Please try again.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handlePreview = async () => {
    const file = fileRef.current?.files?.[0]

    setUploadError(null)
    setRowErrors([])
    setUploadSuccess(null)
    setDeclareSuccess(null)

    if (!file) {
      setUploadError('Choose a CSV file first.')

      return
    }

    setIsPreviewing(true)

    try {
      const formData = new FormData()

      formData.append('file', file)
      formData.append('action', 'preview')
      formData.append('purpose', purpose)

      const response = await fetch('/api/admin/declare-result', { method: 'POST', body: formData })
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setUploadError(body.error ?? 'Validation failed.')
        setRowErrors(Array.isArray(body.rowErrors) ? body.rowErrors : [])

        return
      }

      setPreviewData(body)
      setPreviewOpen(true)
    } catch {
      setUploadError('Could not reach the server. Please try again.')
    } finally {
      setIsPreviewing(false)
    }
  }

  const confirmAndStageFromPreview = async () => {
    const file = fileRef.current?.files?.[0]

    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()

      formData.append('file', file)
      formData.append('action', 'stage')
      formData.append('purpose', purpose)

      const response = await fetch('/api/admin/declare-result', { method: 'POST', body: formData })
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setUploadError(body.error ?? 'Upload failed.')
        setRowErrors(Array.isArray(body.rowErrors) ? body.rowErrors : [])
        setPreviewOpen(false)

        return
      }

      setPreviewOpen(false)
      setUploadSuccess(
        `Sheet saved: ${body.rowCount} booth(s) ready to declare` +
          (body.createdStalls > 0 ? `, ${body.createdStalls} new booth(s) added to inventory.` : '.') +
          ' No one has been notified yet.'
      )

      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch {
      setUploadError('Could not reach the server. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const upload = async () => {
    const file = fileRef.current?.files?.[0]

    setUploadError(null)
    setRowErrors([])
    setUploadSuccess(null)
    setDeclareSuccess(null)

    if (!file) {
      setUploadError('Choose a CSV file first.')

      return
    }

    // Trigger preview directly so user sees the preview and issues first
    await handlePreview()
  }

  const declare = async () => {
    if (!batchId) return

    setIsDeclaring(true)
    setDeclareError(null)
    setDeclareProblems([])

    try {
      const response = await fetch('/api/admin/declare-result/declare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setDeclareError(body.error ?? 'Could not declare the result.')
        setDeclareProblems(Array.isArray(body.problems) ? body.problems : [])

        return
      }

      setConfirmOpen(false)
      setDeclareSuccess(
        `Result declared for ${body.declaredCount} applicant(s). WhatsApp/email messages are being sent now — track them in Notification Logs.`
      )
      router.refresh()
    } catch {
      setDeclareError('Could not reach the server. The result may or may not have been declared — refresh the page to check.')
    } finally {
      setIsDeclaring(false)
    }
  }

  if (tableMissing) {
    return (
      <Alert variant='destructive'>
        <AlertCircleIcon className='size-4' />
        <AlertDescription>Declare Result is not enabled yet — database migration 0081 has not been applied.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-1.5 rounded-lg border bg-muted/30 p-1.5 w-fit'>
        <button
          type='button'
          onClick={() => setPurpose('draw_allotment')}
          className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
            purpose === 'draw_allotment' ? 'bg-[#0c2847] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Draw / Manual Allotment
        </button>
        <button
          type='button'
          onClick={() => setPurpose('auction_result')}
          className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
            purpose === 'auction_result' ? 'bg-[#0c2847] text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Auction Result
        </button>
      </div>

      <Card className='shadow-xs'>
        <CardHeader>
          <CardTitle className='text-base'>1. Upload Result Sheet</CardTitle>
          <CardDescription>
            {purpose === 'auction_result'
              ? 'One row per winner: Booth/Stall No., Single/Double, Category, Direction, Application Number, Final Auction Amount. Only applications currently "Auction Fee Paid" can be given a booth. Booths not yet in inventory are added. Uploading a new sheet replaces the current pending auction sheet. Nobody is notified at this step.'
              : 'One row per booth: Booth/Stall No., Single/Double, Category, Direction, Application Number. Only Approved applications can be given a booth. Booths not yet in inventory are added. Uploading a new sheet replaces the current pending one. Nobody is notified at this step.'}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              render={<a href={`/api/admin/declare-result?purpose=${purpose}`} download />}
            >
              <DownloadIcon className='size-4' />
              Download Template
            </Button>
            <Input
              ref={fileRef}
              type='file'
              accept='.csv'
              className='max-w-xs'
              onChange={() => {
                setUploadError(null)
                setRowErrors([])
              }}
            />
            <Button
              type='button'
              onClick={handlePreview}
              disabled={isPreviewing || isUploading}
              className='bg-[#0c2847] text-white hover:bg-[#071a30]'
            >
              {isPreviewing ? <Loader2Icon className='size-4 animate-spin' /> : <UploadIcon className='size-4' />}
              Upload &amp; Preview Sheet
            </Button>
          </div>

          {uploadSuccess && (
            <Alert>
              <CheckCircle2Icon className='size-4' />
              <AlertDescription>{uploadSuccess}</AlertDescription>
            </Alert>
          )}

          {uploadError && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>
                {uploadError}
                {rowErrors.length > 0 && (
                  <ul className='mt-2 list-disc pl-4 text-xs'>
                    {rowErrors.slice(0, 50).map(e => (
                      <li key={`${e.rowNumber}-${e.message}`}>
                        Row {e.rowNumber}: {e.message}
                      </li>
                    ))}
                    {rowErrors.length > 50 && <li>…and {rowErrors.length - 50} more</li>}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base'>2. Pending Result ({pending.length})</CardTitle>
            <CardDescription>
              {pending.length > 0
                ? `Not yet visible to applicants. ${paymentCount} will get a Pay Now link, ${pending.length - paymentCount} will be marked Allotted.`
                : 'Upload a sheet to see who gets which booth before declaring.'}
            </CardDescription>
          </div>
          {pending.length > 0 && (
            <Button
              type='button'
              onClick={() => {
                setDeclareError(null)
                setDeclareProblems([])
                setConfirmOpen(true)
              }}
              className='bg-[#0c2847] text-white hover:bg-[#06192e]'
            >
              <MegaphoneIcon className='size-4' />
              Declare Result
            </Button>
          )}
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          {declareSuccess && (
            <Alert>
              <CheckCircle2Icon className='size-4' />
              <AlertDescription>{declareSuccess}</AlertDescription>
            </Alert>
          )}
          {rowActionError && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>{rowActionError}</AlertDescription>
            </Alert>
          )}
          {pending.length > 0 && (
            <ResultTable
              rows={pending}
              actions={{
                busyRowId,
                onRemove: removeRow,
                onEdit: row => {
                  setEditingRow(row)
                  setEditValue(row.applicationNumber)
                  setEditError(null)
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      {declared.length > 0 && (
        <Card className='shadow-xs'>
          <CardHeader>
            <CardTitle className='text-base'>Declared ({declared.length})</CardTitle>
            <CardDescription>Most recent first. Current application status is shown.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResultTable rows={declared} showDeclaredAt />
          </CardContent>
        </Card>
      )}

      <Card className='shadow-xs'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <HistoryIcon className='size-4' />
            History
          </CardTitle>
          <CardDescription>
            Every upload, change, removal and declaration — recorded permanently in the audit log, newest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No actions recorded yet.</p>
          ) : (
            <ul className='flex flex-col gap-2.5'>
              {history.map(entry => (
                <HistoryEntryItem key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingRow !== null} onOpenChange={open => !open && setEditingRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change application for booth {editingRow?.stallNumber}</DialogTitle>
            <DialogDescription>
              Currently {editingRow?.applicationNumber} ({editingRow?.applicantName}). The new application must be
              Approved, in the same category, and without a booth. The change is recorded in the history.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value.toUpperCase())}
            placeholder='IGM-2026-123456'
            className='font-mono'
          />
          {editError && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setEditingRow(null)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button type='button' onClick={saveEdit} disabled={isSavingEdit || editValue.trim().length === 0}>
              {isSavingEdit && <Loader2Icon className='animate-spin' />}
              Save Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare result for {pending.length} applicant(s)?</DialogTitle>
            <DialogDescription>
              Each booth will be assigned to its application and every applicant will get a WhatsApp/email message
              {paymentCount > 0 ? ` (${paymentCount} with a Pay Now link)` : ''}. This cannot be undone from this page.
            </DialogDescription>
          </DialogHeader>

          {declareError && (
            <Alert variant='destructive'>
              <AlertCircleIcon className='size-4' />
              <AlertDescription>
                {declareError}
                {declareProblems.length > 0 && (
                  <ul className='mt-2 list-disc pl-4 text-xs'>
                    {declareProblems.slice(0, 30).map(p => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setConfirmOpen(false)} disabled={isDeclaring}>
              Cancel
            </Button>
            <Button type='button' onClick={declare} disabled={isDeclaring} className='bg-[#0c2847] text-white hover:bg-[#06192e]'>
              {isDeclaring && <Loader2Icon className='animate-spin' />}
              Yes, Declare &amp; Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Preview & Validation Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='sm:max-w-4xl max-h-[85vh] flex flex-col p-6'>
          <DialogHeader>
            <DialogTitle className='flex flex-wrap items-center justify-between text-base font-bold text-[#0c2847] gap-2'>
              <span>Sheet Preview &amp; Verification — {previewData?.filename}</span>
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Review all booth allotments, candidate match, and verification checks before staging the pending result.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className='flex flex-col gap-4 overflow-hidden flex-1'>
              {/* Summary counters */}
              <div className='flex flex-wrap items-center gap-2 pt-1'>
                <span className='rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800'>
                  Total: {previewData.totalCount} Booths
                </span>
                <span className='rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800'>
                  ✓ Valid: {previewData.validCount}
                </span>
                {previewData.errorCount > 0 ? (
                  <span className='rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 animate-pulse'>
                    ⚠️ Issues: {previewData.errorCount}
                  </span>
                ) : null}
                {previewData.newStallsCount > 0 && (
                  <span className='rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800'>
                    ✨ New Booths: {previewData.newStallsCount}
                  </span>
                )}
              </div>

              {previewData.errorCount > 0 && (
                <Alert variant='destructive' className='py-2.5'>
                  <AlertCircleIcon className='size-4' />
                  <AlertDescription className='text-xs'>
                    <strong>{previewData.errorCount} row(s) have issues</strong> preventing declaration. Please review the highlighted rows below, fix them in your CSV file, and re-upload.
                  </AlertDescription>
                </Alert>
              )}

              {previewData.errorCount === 0 && (
                <Alert className='border-emerald-200 bg-emerald-50 text-emerald-900 py-2.5'>
                  <CheckCircle2Icon className='size-4 text-emerald-600' />
                  <AlertDescription className='text-xs'>
                    All <strong>{previewData.totalCount}</strong> rows verified successfully. No conflicts found. Ready to save as pending result.
                  </AlertDescription>
                </Alert>
              )}

              {/* Scrollable Preview Table */}
              <div className='overflow-y-auto max-h-[46vh] rounded-lg border border-slate-200'>
                <Table>
                  <TableHeader className='bg-slate-50 sticky top-0 z-10'>
                    <TableRow className='text-xs font-bold uppercase'>
                      <TableHead className='w-12'>#</TableHead>
                      <TableHead>Booth/Stall</TableHead>
                      <TableHead>Type / Facing</TableHead>
                      <TableHead>Application No.</TableHead>
                      <TableHead>Candidate / Firm</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Result Type</TableHead>
                      <TableHead className='min-w-[180px]'>Verification / Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className='text-xs'>
                    {previewData.rows.map(row => (
                      <TableRow
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-slate-50/60' : 'bg-rose-50/70 hover:bg-rose-50'}
                      >
                        <TableCell className='font-mono font-medium text-slate-500'>{row.rowNumber}</TableCell>
                        <TableCell className='font-mono font-bold text-[#0c2847] whitespace-nowrap'>
                          Stall #{row.stallNumber}
                          {row.isNewStall && (
                            <span className='ml-1.5 inline-block text-[9px] font-bold bg-blue-100 text-blue-800 rounded px-1.5 py-0.5'>
                              New
                            </span>
                          )}
                        </TableCell>
                        <TableCell className='capitalize text-muted-foreground whitespace-nowrap'>
                          {[row.shopType, row.direction ? `${row.direction} Facing` : null].filter(Boolean).join(' · ')}
                        </TableCell>
                        <TableCell className='font-mono font-bold text-slate-800 whitespace-nowrap'>
                          {row.applicationNumber}
                        </TableCell>
                        <TableCell>
                          <p className='font-bold text-[#0c2847]'>{row.applicantName || '—'}</p>
                          {row.fatherName && <p className='text-[10px] text-slate-500'>S/O: {row.fatherName}</p>}
                        </TableCell>
                        <TableCell className='whitespace-nowrap'>{row.categoryName}</TableCell>
                        <TableCell className='whitespace-nowrap'>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              row.isPaymentRequired
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {row.isPaymentRequired ? 'Payment Required' : 'Allotted (₹0 Fee)'}
                          </span>
                          {purpose === 'auction_result' && row.finalAmountPaise != null && (
                            <span className='ml-1 font-mono text-[10px] font-bold text-slate-700'>
                              ₹{(row.finalAmountPaise / 100).toLocaleString('en-IN')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <span className='inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700'>
                              <CheckCircle2Icon className='size-3.5' /> Ready
                            </span>
                          ) : (
                            <div className='flex flex-col gap-1'>
                              {row.issues.map((issue, idx) => (
                                <span
                                  key={idx}
                                  className='rounded bg-rose-100 border border-rose-300 px-1.5 py-0.5 text-[10px] font-bold text-rose-900'
                                >
                                  ⚠️ {issue}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className='pt-3 border-t mt-3 flex items-center justify-between sm:justify-between w-full'>
            <Button type='button' variant='outline' onClick={() => setPreviewOpen(false)} disabled={isUploading}>
              Close &amp; Adjust File
            </Button>

            {previewData?.canStage && (
              <Button
                type='button'
                onClick={confirmAndStageFromPreview}
                disabled={isUploading}
                className='bg-emerald-700 hover:bg-emerald-800 text-white font-bold'
              >
                {isUploading ? <Loader2Icon className='animate-spin size-4' /> : <CheckCircle2Icon className='size-4' />}
                Confirm &amp; Save Pending Result
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DeclareResultClient
