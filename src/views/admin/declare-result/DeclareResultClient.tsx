'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { AlertCircleIcon, CheckCircle2Icon, DownloadIcon, HistoryIcon, Loader2Icon, MegaphoneIcon, PencilIcon, Trash2Icon, UploadIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ResultHistoryEntry, ResultRowView } from '@/lib/allotment/declare-result'

type RowError = { rowNumber: number; message: string }

type Props = {
  pending: ResultRowView[]
  declared: ResultRowView[]
  history: ResultHistoryEntry[]
  tableMissing: boolean
}

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
              {showDeclaredAt
                ? row.applicationStatus.replace(/_/g, ' ')
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

const DeclareResultClient = ({ pending, declared, history, tableMissing }: Props) => {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<RowError[]>([])
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

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

    setIsUploading(true)

    try {
      const formData = new FormData()

      formData.append('file', file)

      const response = await fetch('/api/admin/declare-result', { method: 'POST', body: formData })
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setUploadError(body.error ?? 'Upload failed.')
        setRowErrors(Array.isArray(body.rowErrors) ? body.rowErrors : [])

        return
      }

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
      <Card className='shadow-xs'>
        <CardHeader>
          <CardTitle className='text-base'>1. Upload Result Sheet</CardTitle>
          <CardDescription>
            One row per booth: Booth/Stall No., Single/Double, Category, Direction, Application Number. Only Approved
            applications can be given a booth. Booths not yet in inventory are added. Uploading a new sheet replaces the
            current pending one. Nobody is notified at this step.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button type='button' variant='outline' render={<a href='/api/admin/declare-result' download />}>
              <DownloadIcon className='size-4' />
              Download Template
            </Button>
            <Input ref={fileRef} type='file' accept='.csv' className='max-w-xs' />
            <Button type='button' onClick={upload} disabled={isUploading}>
              {isUploading ? <Loader2Icon className='animate-spin' /> : <UploadIcon className='size-4' />}
              Upload Sheet
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
            <ul className='flex flex-col gap-2'>
              {history.map(entry => (
                <li key={entry.id} className='rounded-md border px-3 py-2 text-sm'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='font-semibold text-[#0c2847]'>{HISTORY_LABELS[entry.action] ?? entry.action}</span>
                    <span className='text-xs text-muted-foreground'>
                      {entry.actorName ?? 'System'} · {formatHistoryTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className='mt-0.5 text-xs text-muted-foreground'>{describeHistoryEntry(entry)}</p>
                </li>
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
    </div>
  )
}

export default DeclareResultClient
