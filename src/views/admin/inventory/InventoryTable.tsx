'use client'

import { useMemo, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, StoreIcon, Trash2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type ShopUnitRowData = {
  id: string // opaque-encoded id, for API calls
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string
  direction: string | null
  emdAmountPaise: number | null
  status: 'available' | 'reserved' | 'allotted' | 'cancelled'
  applicationNumber: string | null
}

const STATUS_CONFIG: Record<ShopUnitRowData['status'], { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-emerald-100 text-emerald-800' },
  reserved: { label: 'Reserved', color: 'bg-amber-100 text-amber-800' },
  allotted: { label: 'Allotted', color: 'bg-purple-100 text-purple-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
}

const ALL = '__all__'
const PAGE_SIZE = 25

/**
 * Owns the shop-unit row list client-side so delete (single or bulk)
 * removes rows from local state immediately instead of calling
 * router.refresh(), which was the real cost behind "delete is very slow"
 * (reported live) — refresh() re-ran every query the whole Inventory page
 * needs (~800ms on this remote DB) on top of the delete request itself. The
 * server is still the source of truth: on any delete failure, nothing is
 * removed locally and the real error is shown.
 */
const InventoryTable = ({
  initialRows,
  canManage,
  categoryNames,
  directions
}: {
  initialRows: ShopUnitRowData[]
  canManage: boolean
  categoryNames: string[]
  directions: string[]
}) => {
  const [rows, setRows] = useState(initialRows)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingSingle, setDeletingSingle] = useState<ShopUnitRowData | null>(null)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [directionFilter, setDirectionFilter] = useState(ALL)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    return rows.filter(row => {
      // Search matches stall number, category, direction, or allotted
      // application number — not stall number alone (reported live:
      // "search mein sab kuch search kar paaye", search should find
      // everything, not just one field).
      if (searchLower) {
        const haystack = [row.stallNumber, row.categoryName, row.direction, row.applicationNumber]
          .filter((v): v is string => v !== null)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(searchLower)) return false
      }

      if (categoryFilter !== ALL && row.categoryName !== categoryFilter) return false
      if (statusFilter !== ALL && row.status !== statusFilter) return false
      if (typeFilter !== ALL && row.shopType !== typeFilter) return false
      if (directionFilter !== ALL && (row.direction ?? 'Not Specified') !== directionFilter) return false

      return true
    })
  }, [rows, search, categoryFilter, statusFilter, typeFilter, directionFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  // Clamped rather than reset via an effect: changing a filter can shrink
  // totalPages below whatever `page` currently is, and clamping here
  // computes the valid page directly during render instead of needing a
  // setState-in-effect round-trip just to correct it afterward.
  const currentPage = Math.min(page, totalPages)
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const deletableSelectedIds = useMemo(
    () => rows.filter(r => selectedIds.has(r.id) && r.status !== 'allotted').map(r => r.id),
    [rows, selectedIds]
  )

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)

      if (checked) next.add(id)
      else next.delete(id)

      return next
    })
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => {
        const next = new Set(prev)

        for (const row of pageRows) {
          if (row.status !== 'allotted') next.add(row.id)
        }

        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)

        for (const row of pageRows) next.delete(row.id)

        return next
      })
    }
  }

  const handleSingleDelete = async () => {
    if (!deletingSingle) return

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/inventory/${deletingSingle.id}`, { method: 'DELETE' })
      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? 'Could not delete this stall.')

        return
      }

      setRows(prev => prev.filter(r => r.id !== deletingSingle.id))
      setSelectedIds(prev => {
        const next = new Set(prev)

        next.delete(deletingSingle.id)

        return next
      })
      setDeletingSingle(null)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/inventory/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deletableSelectedIds })
      })

      const body = await response.json()

      if (!response.ok) {
        setError(body.error ?? 'Could not delete the selected stalls.')

        return
      }

      const deletedSet = new Set<string>(body.deletedIds)

      setRows(prev => prev.filter(r => !deletedSet.has(r.id)))
      setSelectedIds(new Set())
      setBulkDialogOpen(false)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const pageSelectableCount = pageRows.filter(r => r.status !== 'allotted').length
  const pageSelectedCount = pageRows.filter(r => r.status !== 'allotted' && selectedIds.has(r.id)).length
  const allSelected = pageSelectableCount > 0 && pageSelectedCount === pageSelectableCount

  const hasActiveFilters =
    search.trim() !== '' || categoryFilter !== ALL || statusFilter !== ALL || typeFilter !== ALL || directionFilter !== ALL

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter(ALL)
    setStatusFilter(ALL)
    setTypeFilter(ALL)
    setDirectionFilter(ALL)
  }

  return (
    <Card className='shadow-xs'>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <CardTitle className='text-base font-bold text-[#0c2847]'>Booth/Stall Units</CardTitle>
            <CardDescription className='text-xs'>
              {filteredRows.length} of {rows.length} units{hasActiveFilters ? ' (filtered)' : ''}.
            </CardDescription>
          </div>

          {canManage && deletableSelectedIds.length > 0 && (
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger render={<Button variant='destructive' size='sm' />}>
                <Trash2Icon />
                Delete {deletableSelectedIds.length} Selected
              </DialogTrigger>
              <DialogContent className='sm:max-w-sm'>
                <DialogHeader>
                  <DialogTitle>Delete {deletableSelectedIds.length} stall(s)?</DialogTitle>
                  <DialogDescription>This permanently removes the selected stalls from inventory. This cannot be undone.</DialogDescription>
                </DialogHeader>

                {error && (
                  <Alert variant='destructive'>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button type='button' variant='outline' onClick={() => setBulkDialogOpen(false)} disabled={isDeleting}>
                    Cancel
                  </Button>
                  <Button type='button' variant='destructive' onClick={handleBulkDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2Icon className='animate-spin' />}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {rows.length > 0 && (
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <Input
              placeholder='Search…'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='h-8 w-44 text-sm'
            />

            <Select value={categoryFilter} onValueChange={value => setCategoryFilter(value ?? ALL)}>
              <SelectTrigger size='sm' className='w-44'>
                {/* Rendering the label explicitly rather than relying on
                    SelectValue's automatic item lookup — that lookup was
                    showing the raw "__all__" sentinel value instead of "All
                    Categories" (reported live), since this base-ui version's
                    internal item registry wasn't resolving it correctly for
                    dynamically-mapped <SelectItem>s. */}
                <SelectValue>{categoryFilter === ALL ? 'All Categories' : categoryFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Categories</SelectItem>
                {categoryNames.map(name => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={value => setStatusFilter(value ?? ALL)}>
              <SelectTrigger size='sm' className='w-32'>
                <SelectValue>
                  {statusFilter === ALL ? 'All Statuses' : STATUS_CONFIG[statusFilter as ShopUnitRowData['status']].label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as Array<ShopUnitRowData['status']>).map(status => (
                  <SelectItem key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={value => setTypeFilter(value ?? ALL)}>
              <SelectTrigger size='sm' className='w-28'>
                <SelectValue>
                  {typeFilter === ALL ? 'All Types' : typeFilter === 'single' ? 'Single' : 'Double'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Types</SelectItem>
                <SelectItem value='single'>Single</SelectItem>
                <SelectItem value='double'>Double</SelectItem>
              </SelectContent>
            </Select>

            <Select value={directionFilter} onValueChange={value => setDirectionFilter(value ?? ALL)}>
              <SelectTrigger size='sm' className='w-36'>
                <SelectValue>{directionFilter === ALL ? 'All Directions' : directionFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Directions</SelectItem>
                {directions.map(direction => (
                  <SelectItem key={direction} value={direction}>
                    {direction}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button type='button' variant='ghost' size='sm' onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className='p-0'>
        {rows.length === 0 ? (
          <div className='py-16 text-center'>
            <StoreIcon className='mx-auto mb-2 size-8 text-muted-foreground/50' />
            <p className='text-sm font-semibold text-muted-foreground'>
              No booth/stall units yet.{canManage ? ' Import a CSV to get started.' : ''}
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className='py-16 text-center'>
            <StoreIcon className='mx-auto mb-2 size-8 text-muted-foreground/50' />
            <p className='text-sm font-semibold text-muted-foreground'>No booth/stall units match these filters.</p>
            <Button type='button' variant='link' size='sm' onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {canManage && (
                  <TableHead className='w-10'>
                    <Checkbox checked={allSelected} onCheckedChange={checked => toggleAll(checked === true)} aria-label='Select all' />
                  </TableHead>
                )}
                <TableHead>Stall No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>EMD Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Allotted To</TableHead>
                {canManage && <TableHead className='w-12' />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(row => (
                <TableRow key={row.id}>
                  {canManage && (
                    <TableCell>
                      {row.status !== 'allotted' && (
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={checked => toggleRow(row.id, checked === true)}
                          aria-label={`Select stall ${row.stallNumber}`}
                        />
                      )}
                    </TableCell>
                  )}
                  <TableCell className='font-mono font-bold text-[#0c2847]'>{row.stallNumber}</TableCell>
                  <TableCell className='capitalize'>{row.shopType}</TableCell>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell>{row.direction ?? '—'}</TableCell>
                  <TableCell>
                    {row.emdAmountPaise !== null ? `₹${(row.emdAmountPaise / 100).toLocaleString('en-IN')}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_CONFIG[row.status].color}>{STATUS_CONFIG[row.status].label}</Badge>
                  </TableCell>
                  <TableCell className='font-mono text-xs'>{row.applicationNumber ?? '—'}</TableCell>
                  {canManage && (
                    <TableCell>
                      {row.status !== 'allotted' && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='text-red-600 hover:bg-red-50 hover:text-red-700'
                          onClick={() => {
                            setError(null)
                            setDeletingSingle(row)
                          }}
                        >
                          <Trash2Icon className='size-4' />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filteredRows.length > PAGE_SIZE && (
          <div className='flex items-center justify-between border-t px-4 py-3 text-sm'>
            <p className='text-xs text-muted-foreground'>
              Showing <span className='font-semibold text-slate-700'>{(currentPage - 1) * PAGE_SIZE + 1}</span>–
              <span className='font-semibold text-slate-700'>{Math.min(currentPage * PAGE_SIZE, filteredRows.length)}</span> of{' '}
              <span className='font-semibold text-slate-700'>{filteredRows.length}</span>
            </p>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeftIcon className='size-3.5' /> Previous
              </Button>
              <span className='px-2 text-xs font-semibold text-muted-foreground'>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRightIcon className='size-3.5' />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!deletingSingle} onOpenChange={open => !open && setDeletingSingle(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Delete Stall {deletingSingle?.stallNumber}?</DialogTitle>
            <DialogDescription>This permanently removes this stall from inventory. This cannot be undone.</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setDeletingSingle(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type='button' variant='destructive' onClick={handleSingleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2Icon className='animate-spin' />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InventoryTable
