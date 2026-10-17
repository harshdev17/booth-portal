'use client'

import { useMemo, useState } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, PencilIcon, PlusIcon, StoreIcon, Trash2Icon } from 'lucide-react'

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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export type ShopUnitRowData = {
  id: string // opaque-encoded id, for API calls
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string
  direction: string | null
  emdAmountPaise: number | null
  status: 'available' | 'reserved' | 'allotted' | 'cancelled' | 'rejected'
  applicationNumber: string | null
  isDirectAllotment?: boolean
}

const STATUS_CONFIG: Record<ShopUnitRowData['status'], { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-emerald-100 text-emerald-800' },
  reserved: { label: 'Reserved', color: 'bg-amber-100 text-amber-800' },
  allotted: { label: 'Allotted', color: 'bg-purple-100 text-purple-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800' }
}

const ALL = '__all__'
const PAGE_SIZE = 25

type StallFormState = {
  stallNumber: string
  shopType: 'single' | 'double' | ''
  categoryName: string
  direction: string
  emdAmount: string
  status: ShopUnitRowData['status']
}

const EMPTY_FORM: StallFormState = {
  stallNumber: '',
  shopType: '',
  categoryName: '',
  direction: '',
  emdAmount: '',
  status: 'available'
}

type AddStallFormState = {
  stallNumber: string
  shopType: 'single' | 'double' | ''
  categoryMode: 'existing' | 'new'
  categoryName: string
  newCategoryName: string
  direction: string
  emdAmount: string
  isDirectAllotment: boolean
  allotteeName: string
  contactPerson: string
  mobileNumber: string
  notes: string
}

const EMPTY_ADD_FORM: AddStallFormState = {
  stallNumber: '',
  shopType: '',
  categoryMode: 'existing',
  categoryName: '',
  newCategoryName: '',
  direction: '',
  emdAmount: '',
  isDirectAllotment: false,
  allotteeName: '',
  contactPerson: '',
  mobileNumber: '',
  notes: ''
}

// Status is only ever shown/settable while editing an existing unit — a
// brand-new stall always starts 'available' (see the create API route) and
// 'allotted' is never admin-settable here, same reasoning as the DELETE
// guard above: that transition belongs to the Allotment module. 'cancelled'
// was dropped from this editable set per explicit request ("cancelled ki
// need nahi hai, bas 2 hi rakho") — only Available/Reserved remain settable
// from the UI; the enum value itself is untouched in the DB/schema.
const EDITABLE_EDIT_STATUSES: Array<ShopUnitRowData['status']> = ['available', 'reserved', 'rejected']

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
  const [availableCategories, setAvailableCategories] = useState<string[]>(categoryNames)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingSingle, setDeletingSingle] = useState<ShopUnitRowData | null>(null)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bulkStatus, setBulkStatus] = useState<ShopUnitRowData['status']>('available')
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false)
  const [bulkStatusError, setBulkStatusError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [stallCategoryTab, setStallCategoryTab] = useState<'all' | 'public' | 'direct'>('all')
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [directionFilter, setDirectionFilter] = useState(ALL)
  const [page, setPage] = useState(1)

  const tabCounts = useMemo(() => {
    const total = rows.length
    const direct = rows.filter(r => Boolean(r.isDirectAllotment)).length
    const publicStalls = rows.filter(r => !r.isDirectAllotment).length

    return { total, direct, public: publicStalls }
  }, [rows])

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddStallFormState>(EMPTY_ADD_FORM)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingRow, setEditingRow] = useState<ShopUnitRowData | null>(null)
  const [editForm, setEditForm] = useState<StallFormState>(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const filteredRows = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    return rows.filter(row => {
      // Tab filter: all vs public/draw vs direct entry
      if (stallCategoryTab === 'direct' && !row.isDirectAllotment) return false
      if (stallCategoryTab === 'public' && row.isDirectAllotment) return false

      if (searchLower) {
        const haystack = [
          row.stallNumber,
          row.categoryName,
          row.direction,
          row.applicationNumber,
          row.isDirectAllotment ? 'direct allotment direct entry' : 'public draw'
        ]
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
  }, [rows, stallCategoryTab, search, categoryFilter, statusFilter, typeFilter, directionFilter])

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
        setError(body.error ?? 'Could not delete this booth/stall.')

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
        setError(body.error ?? 'Could not delete the selected booths/stalls.')

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

  const handleBulkStatusUpdate = async () => {
    setIsBulkUpdatingStatus(true)
    setBulkStatusError(null)

    try {
      const response = await fetch('/api/admin/inventory/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deletableSelectedIds, status: bulkStatus })
      })

      const body = await response.json()

      if (!response.ok) {
        setBulkStatusError(body.error ?? 'Could not update status for the selected booths/stalls.')

        return
      }

      const updatedSet = new Set<string>(body.updatedIds)

      setRows(prev => prev.map(r => (updatedSet.has(r.id) ? { ...r, status: bulkStatus } : r)))
      setSelectedIds(new Set())
    } catch {
      setBulkStatusError('Could not reach the server. Please try again.')
    } finally {
      setIsBulkUpdatingStatus(false)
    }
  }

  const openEditDialog = (row: ShopUnitRowData) => {
    setEditError(null)
    setEditingRow(row)
    setEditForm({
      stallNumber: row.stallNumber,
      shopType: row.shopType,
      categoryName: row.categoryName,
      direction: row.direction ?? '',
      emdAmount: row.emdAmountPaise !== null ? String(row.emdAmountPaise / 100) : '',
      status: row.status
    })
  }

  const handleAddSubmit = async () => {
    const finalCategory = (addForm.categoryMode === 'new' ? addForm.newCategoryName.trim() : addForm.categoryName).trim()

    if (!addForm.stallNumber.trim() || !addForm.shopType || !finalCategory) {
      setAddError('Booth/Stall number, type, and category are required.')

      return
    }

    if (addForm.isDirectAllotment && !addForm.allotteeName.trim()) {
      setAddError('Organisation / Allottee name is required for direct allotment.')

      return
    }

    setAddSubmitting(true)
    setAddError(null)

    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallNumber: addForm.stallNumber.trim(),
          shopType: addForm.shopType,
          categoryName: finalCategory,
          isNewCategory: addForm.categoryMode === 'new',
          direction: addForm.direction.trim() || null,
          emdAmountPaise: addForm.emdAmount.trim() ? Math.round(Number(addForm.emdAmount) * 100) : null,
          isDirectAllotment: addForm.isDirectAllotment,
          allotteeName: addForm.isDirectAllotment ? addForm.allotteeName.trim() : null,
          contactPerson: addForm.isDirectAllotment ? addForm.contactPerson.trim() || null : null,
          mobileNumber: addForm.isDirectAllotment ? addForm.mobileNumber.trim() || null : null,
          notes: addForm.isDirectAllotment ? addForm.notes.trim() || null : null
        })
      })

      const body = await response.json()

      if (!response.ok) {
        setAddError(body.error ?? 'Could not create this booth/stall.')

        return
      }

      setRows(prev => [
        ...prev,
        {
          id: body.id,
          stallNumber: addForm.stallNumber.trim(),
          shopType: addForm.shopType as 'single' | 'double',
          categoryName: finalCategory,
          direction: addForm.direction.trim() || null,
          emdAmountPaise: addForm.emdAmount.trim() ? Math.round(Number(addForm.emdAmount) * 100) : null,
          status: body.status || (addForm.isDirectAllotment ? 'allotted' : 'available'),
          applicationNumber: body.applicationNumber || (addForm.isDirectAllotment ? addForm.allotteeName.trim() : null),
          isDirectAllotment: addForm.isDirectAllotment
        }
      ])

      if (!availableCategories.includes(finalCategory)) {
        setAvailableCategories(prev => [...prev, finalCategory].sort())
      }

      setAddForm(EMPTY_ADD_FORM)
      setAddOpen(false)
    } catch {
      setAddError('Could not reach the server. Please try again.')
    } finally {
      setAddSubmitting(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!editingRow) return

    if (!editForm.stallNumber.trim() || !editForm.shopType || !editForm.categoryName) {
      setEditError('Booth/Stall number, type, and category are required.')

      return
    }

    setEditSubmitting(true)
    setEditError(null)

    try {
      const response = await fetch(`/api/admin/inventory/${editingRow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stallNumber: editForm.stallNumber.trim(),
          shopType: editForm.shopType,
          categoryName: editForm.categoryName,
          direction: editForm.direction.trim() || null,
          emdAmountPaise: editForm.emdAmount.trim() ? Math.round(Number(editForm.emdAmount) * 100) : null,
          status: editForm.status
        })
      })

      const body = await response.json()

      if (!response.ok) {
        setEditError(body.error ?? 'Could not update this booth/stall.')

        return
      }

      const updatedId = editingRow.id

      setRows(prev =>
        prev.map(r =>
          r.id === updatedId
            ? {
                ...r,
                stallNumber: editForm.stallNumber.trim(),
                shopType: editForm.shopType as 'single' | 'double',
                categoryName: editForm.categoryName,
                direction: editForm.direction.trim() || null,
                emdAmountPaise: editForm.emdAmount.trim() ? Math.round(Number(editForm.emdAmount) * 100) : null,
                status: editForm.status
              }
            : r
        )
      )
      setEditingRow(null)
    } catch {
      setEditError('Could not reach the server. Please try again.')
    } finally {
      setEditSubmitting(false)
    }
  }

  const pageSelectableCount = pageRows.filter(r => r.status !== 'allotted').length
  const pageSelectedCount = pageRows.filter(r => r.status !== 'allotted' && selectedIds.has(r.id)).length
  const allSelected = pageSelectableCount > 0 && pageSelectedCount === pageSelectableCount

  const hasActiveFilters =
    stallCategoryTab !== 'all' ||
    search.trim() !== '' ||
    categoryFilter !== ALL ||
    statusFilter !== ALL ||
    typeFilter !== ALL ||
    directionFilter !== ALL

  const clearFilters = () => {
    setStallCategoryTab('all')
    setSearch('')
    setCategoryFilter(ALL)
    setStatusFilter(ALL)
    setTypeFilter(ALL)
    setDirectionFilter(ALL)
  }

  return (
    <Card className='shadow-xs'>
      {/* 3 Navigation Tabs with Live Counts */}
      <div className='border-b bg-muted/20 px-4 pt-2.5 pb-0'>
        <div className='flex gap-2 sm:gap-6 overflow-x-auto'>
          <button
            type='button'
            onClick={() => { setStallCategoryTab('all'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              stallCategoryTab === 'all'
                ? 'border-[#0c2847] text-[#0c2847]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            All Booths/Stalls
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'all' ? 'bg-[#0c2847] text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {tabCounts.total}
            </span>
          </button>

          <button
            type='button'
            onClick={() => { setStallCategoryTab('public'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              stallCategoryTab === 'public'
                ? 'border-[#0c2847] text-[#0c2847]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Public / Draw Stalls
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'public' ? 'bg-[#0c2847] text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {tabCounts.public}
            </span>
          </button>

          <button
            type='button'
            onClick={() => { setStallCategoryTab('direct'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
              stallCategoryTab === 'direct'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Direct Allotment
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'direct' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {tabCounts.direct}
            </span>
          </button>
        </div>
      </div>
      <CardHeader className='border-b bg-muted/40 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <CardTitle className='text-base font-bold text-[#0c2847]'>Booth/Stall Units</CardTitle>
            <CardDescription className='text-xs'>
              {filteredRows.length} of {rows.length} units
            </CardDescription>
          </div>

          <div className='flex items-center gap-2'>
            {canManage && deletableSelectedIds.length > 0 && (
              <div className='flex items-center gap-1.5'>
                <Select value={bulkStatus} onValueChange={value => setBulkStatus((value as ShopUnitRowData['status']) ?? bulkStatus)}>
                  <SelectTrigger size='sm' className='w-32'>
                    <SelectValue>{STATUS_CONFIG[bulkStatus].label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EDITABLE_EDIT_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>
                        {STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type='button' variant='outline' size='sm' onClick={handleBulkStatusUpdate} disabled={isBulkUpdatingStatus}>
                  {isBulkUpdatingStatus && <Loader2Icon className='animate-spin' />}
                  Set Status ({deletableSelectedIds.length})
                </Button>
              </div>
            )}

            {canManage && deletableSelectedIds.length > 0 && (
              <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogTrigger render={<Button variant='destructive' size='sm' />}>
                  <Trash2Icon />
                  Delete {deletableSelectedIds.length} Selected
                </DialogTrigger>
                <DialogContent className='sm:max-w-sm'>
                  <DialogHeader>
                    <DialogTitle>Delete {deletableSelectedIds.length} stall(s)?</DialogTitle>
                    <DialogDescription>This permanently removes the selected booths/stalls from inventory. This cannot be undone.</DialogDescription>
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

            {canManage && (
              <Dialog
                open={addOpen}
                onOpenChange={open => {
                  setAddOpen(open)

                  if (!open) {
                    setAddForm(EMPTY_ADD_FORM)
                    setAddError(null)
                  }
                }}
              >
                <DialogTrigger render={<Button size='sm' />}>
                  <PlusIcon />
                  Add Booth/Stall
                </DialogTrigger>
                <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>Add Booth/Stall Unit</DialogTitle>
                    <DialogDescription>
                      Create a booth/stall unit in inventory. Optionally assign directly to an allottee.
                    </DialogDescription>
                  </DialogHeader>

                  <div className='grid gap-4 py-1'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='add-stall-number'>Booth/Stall Number <span className='text-destructive'>*</span></Label>
                        <Input
                          id='add-stall-number'
                          value={addForm.stallNumber}
                          onChange={e => setAddForm(prev => ({ ...prev, stallNumber: e.target.value }))}
                          placeholder='e.g. A-101'
                        />
                      </div>

                      <div className='grid gap-1.5'>
                        <Label>Type <span className='text-destructive'>*</span></Label>
                        <Select
                          value={addForm.shopType || undefined}
                          onValueChange={value => setAddForm(prev => ({ ...prev, shopType: (value as 'single' | 'double') ?? '' }))}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select type' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='single'>Single</SelectItem>
                            <SelectItem value='double'>Double</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className='grid gap-1.5'>
                      <div className='flex items-center justify-between'>
                        <Label>Category <span className='text-destructive'>*</span></Label>
                        <button
                          type='button'
                          onClick={() => setAddForm(prev => ({
                            ...prev,
                            categoryMode: prev.categoryMode === 'existing' ? 'new' : 'existing',
                            categoryName: '',
                            newCategoryName: ''
                          }))}
                          className='text-xs text-primary font-medium hover:underline'
                        >
                          {addForm.categoryMode === 'existing' ? '+ Create New Category' : '← Select Existing'}
                        </button>
                      </div>
                      {addForm.categoryMode === 'existing' ? (
                        <Select
                          value={addForm.categoryName || undefined}
                          onValueChange={value => setAddForm(prev => ({ ...prev, categoryName: value ?? '' }))}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select category' />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCategories.map(name => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={addForm.newCategoryName}
                          onChange={e => setAddForm(prev => ({ ...prev, newCategoryName: e.target.value }))}
                          placeholder='e.g. VIP Enclosure / Govt Pavilions'
                          autoFocus
                        />
                      )}
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='add-direction'>Direction (optional)</Label>
                        <Input
                          id='add-direction'
                          value={addForm.direction}
                          onChange={e => setAddForm(prev => ({ ...prev, direction: e.target.value }))}
                          placeholder='e.g. North'
                        />
                      </div>

                      <div className='grid gap-1.5'>
                        <Label htmlFor='add-emd'>EMD in ₹ (optional)</Label>
                        <Input
                          id='add-emd'
                          type='number'
                          min='0'
                          value={addForm.emdAmount}
                          onChange={e => setAddForm(prev => ({ ...prev, emdAmount: e.target.value }))}
                          placeholder='e.g. 5000'
                        />
                      </div>
                    </div>

                    <div className='rounded-lg border p-3.5 bg-slate-50/80 dark:bg-slate-900/40 space-y-3'>
                      <div className='flex items-center justify-between gap-3'>
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-2'>
                            <Label htmlFor='direct-allotment-toggle' className='font-semibold text-sm cursor-pointer text-[#0c2847] dark:text-slate-100'>
                              Direct Allotment
                            </Label>
                            {addForm.isDirectAllotment && (
                              <Badge className='bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 text-[10px] py-0 px-1.5'>
                                Admin Only
                              </Badge>
                            )}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Directly assign this stall to an organisation / VIP without public application
                          </p>
                        </div>
                        <Switch
                          id='direct-allotment-toggle'
                          checked={addForm.isDirectAllotment}
                          onCheckedChange={checked => setAddForm(prev => ({ ...prev, isDirectAllotment: checked }))}
                        />
                      </div>

                      {addForm.isDirectAllotment && (
                        <div className='grid gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-800'>
                          <div className='grid gap-1.5'>
                            <Label htmlFor='add-allottee-name' className='text-xs font-semibold'>
                              Organisation / Allottee Name <span className='text-destructive'>*</span>
                            </Label>
                            <Input
                              id='add-allottee-name'
                              value={addForm.allotteeName}
                              onChange={e => setAddForm(prev => ({ ...prev, allotteeName: e.target.value }))}
                              placeholder='e.g. Haryana Tourism / Dept of Forest'
                            />
                          </div>

                          <div className='grid grid-cols-2 gap-3'>
                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-contact-person' className='text-xs font-semibold'>Contact Person</Label>
                              <Input
                                id='add-contact-person'
                                value={addForm.contactPerson}
                                onChange={e => setAddForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                                placeholder='e.g. Ramesh Kumar'
                              />
                            </div>

                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-mobile' className='text-xs font-semibold'>Mobile Number</Label>
                              <Input
                                id='add-mobile'
                                value={addForm.mobileNumber}
                                onChange={e => setAddForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                placeholder='e.g. 9876543210'
                              />
                            </div>
                          </div>

                          <div className='grid gap-1.5'>
                            <Label htmlFor='add-notes' className='text-xs font-semibold'>Allotment Note / Memo Ref (optional)</Label>
                            <Textarea
                              id='add-notes'
                              rows={2}
                              value={addForm.notes}
                              onChange={e => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder='e.g. Allotted as per DC Office Order #412'
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {addError && (
                    <Alert variant='destructive'>
                      <AlertDescription>{addError}</AlertDescription>
                    </Alert>
                  )}

                  <DialogFooter>
                    <Button type='button' variant='outline' onClick={() => setAddOpen(false)} disabled={addSubmitting}>
                      Cancel
                    </Button>
                    <Button type='button' onClick={handleAddSubmit} disabled={addSubmitting}>
                      {addSubmitting && <Loader2Icon className='animate-spin' />}
                      {addForm.isDirectAllotment ? 'Create & Allot Stall' : 'Create Booth/Stall'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {bulkStatusError && (
          <Alert variant='destructive' className='mt-3'>
            <AlertDescription>{bulkStatusError}</AlertDescription>
          </Alert>
        )}

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
                {availableCategories.map(name => (
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
                <TableHead>Booth/Stall No.</TableHead>
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
                          aria-label={`Select booth/stall ${row.stallNumber}`}
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
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <Badge className={STATUS_CONFIG[row.status].color}>{STATUS_CONFIG[row.status].label}</Badge>
                      {row.isDirectAllotment && (
                        <Badge variant='outline' className='bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold py-0 px-1.5 shadow-2xs'>
                          Direct Allotment
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-xs'>
                    {row.applicationNumber ? (
                      <div className='flex flex-col gap-0.5'>
                        <span className='font-mono font-medium text-slate-800 dark:text-slate-200'>{row.applicationNumber}</span>
                        {row.isDirectAllotment && (
                          <span className='inline-flex items-center gap-1 text-[10px] text-purple-700 font-semibold'>
                            <span className='size-1.5 rounded-full bg-purple-600'></span> Direct Allotment
                          </span>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {row.status !== 'allotted' && (
                        <div className='flex items-center gap-1'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground hover:bg-slate-100 hover:text-[#0c2847]'
                            onClick={() => openEditDialog(row)}
                          >
                            <PencilIcon className='size-4' />
                          </Button>
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
                        </div>
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
            <DialogDescription>This permanently removes this booth/stall from inventory. This cannot be undone.</DialogDescription>
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

      <Dialog open={!!editingRow} onOpenChange={open => !open && setEditingRow(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Stall {editingRow?.stallNumber}</DialogTitle>
            <DialogDescription>Update this booth/stall unit&apos;s details.</DialogDescription>
          </DialogHeader>

          <div className='grid gap-3'>
            <div className='grid gap-1.5'>
              <Label htmlFor='edit-stall-number'>Booth/Stall Number</Label>
              <Input
                id='edit-stall-number'
                value={editForm.stallNumber}
                onChange={e => setEditForm(prev => ({ ...prev, stallNumber: e.target.value }))}
              />
            </div>

            <div className='grid gap-1.5'>
              <Label>Type</Label>
              <Select
                value={editForm.shopType || undefined}
                onValueChange={value => setEditForm(prev => ({ ...prev, shopType: (value as 'single' | 'double') ?? '' }))}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='single'>Single</SelectItem>
                  <SelectItem value='double'>Double</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-1.5'>
              <Label>Category</Label>
              <Select
                value={editForm.categoryName || undefined}
                onValueChange={value => setEditForm(prev => ({ ...prev, categoryName: value ?? '' }))}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-1.5'>
              <Label htmlFor='edit-direction'>Direction (optional)</Label>
              <Input
                id='edit-direction'
                value={editForm.direction}
                onChange={e => setEditForm(prev => ({ ...prev, direction: e.target.value }))}
              />
            </div>

            <div className='grid gap-1.5'>
              <Label htmlFor='edit-emd'>EMD Amount in ₹ (optional)</Label>
              <Input
                id='edit-emd'
                type='number'
                min='0'
                value={editForm.emdAmount}
                onChange={e => setEditForm(prev => ({ ...prev, emdAmount: e.target.value }))}
              />
            </div>

            <div className='grid gap-1.5'>
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={value =>
                  setEditForm(prev => ({ ...prev, status: (value as ShopUnitRowData['status']) ?? prev.status }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{STATUS_CONFIG[editForm.status].label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_EDIT_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {editError && (
            <Alert variant='destructive'>
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setEditingRow(null)} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button type='button' onClick={handleEditSubmit} disabled={editSubmitting}>
              {editSubmitting && <Loader2Icon className='animate-spin' />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InventoryTable
