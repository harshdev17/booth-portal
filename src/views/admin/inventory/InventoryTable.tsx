'use client'

import { useMemo, useState } from 'react'

import {
  AlertTriangleIcon,
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  StoreIcon,
  Trash2Icon,
  UserPlusIcon
} from 'lucide-react'

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
  newCategoryFee: string
  direction: string
  isDirectAllotment: boolean
  allotteeName: string
  fatherName: string
  aadhaarNumber: string
  contactPerson: string
  address: string
  mobileNumber: string
  email: string
  workPurpose: string
  notes: string
  sendNotification: boolean
}

const EMPTY_ADD_FORM: AddStallFormState = {
  stallNumber: '',
  shopType: '',
  categoryMode: 'existing',
  categoryName: '',
  newCategoryName: '',
  newCategoryFee: '',
  direction: '',
  isDirectAllotment: false,
  allotteeName: '',
  fatherName: '',
  aadhaarNumber: '',
  contactPerson: '',
  address: '',
  mobileNumber: '',
  email: '',
  workPurpose: '',
  notes: '',
  sendNotification: true
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
  const [stallCategoryTab, setStallCategoryTab] = useState<'all' | 'available' | 'allotted' | 'public' | 'direct'>('all')
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [directionFilter, setDirectionFilter] = useState(ALL)
  const [page, setPage] = useState(1)

  const tabCounts = useMemo(() => {
    const total = rows.length
    const available = rows.filter(r => r.status === 'available').length
    const allotted = rows.filter(r => r.status === 'allotted').length
    const direct = rows.filter(r => Boolean(r.isDirectAllotment)).length
    const publicStalls = rows.filter(r => !r.isDirectAllotment).length

    return { total, available, allotted, direct, public: publicStalls }
  }, [rows])

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddStallFormState>(EMPTY_ADD_FORM)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editingRow, setEditingRow] = useState<ShopUnitRowData | null>(null)
  const [editForm, setEditForm] = useState<StallFormState>(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Cancellation state
  const [cancellingAllotmentRow, setCancellingAllotmentRow] = useState<ShopUnitRowData | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelSendNotification, setCancelSendNotification] = useState(true)
  const [isCancellingAllotment, setIsCancellingAllotment] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  // Direct Re-allotment state
  const [allottingRow, setAllottingRow] = useState<ShopUnitRowData | null>(null)
  const [allotForm, setAllotForm] = useState({
    allotteeName: '',
    fatherName: '',
    aadhaarNumber: '',
    contactPerson: '',
    address: '',
    mobileNumber: '',
    email: '',
    workPurpose: '',
    paymentAmountRupees: '0',
    notes: '',
    sendNotification: true
  })
  const [isSubmittingAllot, setIsSubmittingAllot] = useState(false)
  const [allotError, setAllotError] = useState<string | null>(null)

  const handleConfirmCancelAllotment = async () => {
    if (!cancellingAllotmentRow) return
    setIsCancellingAllotment(true)
    setCancelError(null)

    try {
      const res = await fetch(`/api/admin/inventory/${cancellingAllotmentRow.id}/cancel-allotment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          sendNotification: cancelSendNotification
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error ?? 'Failed to cancel allotment.')
        return
      }

      setRows(current =>
        current.map(r =>
          r.id === cancellingAllotmentRow.id
            ? { ...r, status: 'available', applicationNumber: null, isDirectAllotment: false }
            : r
        )
      )

      setCancellingAllotmentRow(null)
    } catch {
      setCancelError('Network error while cancelling allotment.')
    } finally {
      setIsCancellingAllotment(false)
    }
  }

  const openDirectAllotRowDialog = (row: ShopUnitRowData) => {
    setAllottingRow(row)
    setAllotError(null)
    setAllotForm({
      allotteeName: '',
      fatherName: '',
      aadhaarNumber: '',
      contactPerson: '',
      address: '',
      mobileNumber: '',
      email: '',
      workPurpose: '',
      paymentAmountRupees: row.emdAmountPaise ? String(Math.round(row.emdAmountPaise / 100)) : '0',
      notes: '',
      sendNotification: true
    })
  }

  const handleDirectAllotSubmit = async () => {
    if (!allottingRow) return

    if (!allotForm.allotteeName.trim()) {
      setAllotError('Organisation / Allottee name is mandatory.')
      return
    }
    if (!allotForm.fatherName.trim()) {
      setAllotError("Father's name is mandatory.")
      return
    }
    if (!/^\d{12}$/.test(allotForm.aadhaarNumber.trim().replace(/\s+/g, ''))) {
      setAllotError('Aadhaar number must be exactly 12 digits.')
      return
    }
    if (!allotForm.address.trim()) {
      setAllotError('Full address is mandatory.')
      return
    }
    if (!/^[6-9]\d{9}$/.test(allotForm.mobileNumber.trim().replace(/\D/g, '').slice(-10))) {
      setAllotError('A valid 10-digit mobile number is mandatory.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allotForm.email.trim())) {
      setAllotError('A valid email address is mandatory.')
      return
    }
    if (!allotForm.workPurpose.trim()) {
      setAllotError('Purpose of stall / activity is mandatory.')
      return
    }

    setIsSubmittingAllot(true)
    setAllotError(null)

    try {
      const res = await fetch(`/api/admin/inventory/${allottingRow.id}/direct-allot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allotForm)
      })

      const data = await res.json()
      if (!res.ok) {
        setAllotError(data.error ?? 'Failed to allot stall.')
        return
      }

      setRows(current =>
        current.map(r =>
          r.id === allottingRow.id
            ? {
                ...r,
                status: (data.status as ShopUnitRowData['status']) || 'allotted',
                applicationNumber: data.applicationNumber || allotForm.allotteeName,
                isDirectAllotment: true
              }
            : r
        )
      )

      setAllottingRow(null)
    } catch {
      setAllotError('Failed to communicate with server.')
    } finally {
      setIsSubmittingAllot(false)
    }
  }

  const filteredRows = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    return rows.filter(row => {
      // Tab filter: all vs available vs allotted vs public/draw vs direct entry
      if (stallCategoryTab === 'available' && row.status !== 'available') return false
      if (stallCategoryTab === 'allotted' && row.status !== 'allotted') return false
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

    if (addForm.isDirectAllotment) {
      if (!addForm.allotteeName.trim()) {
        setAddError('Organisation / Allottee name is mandatory.')

        return
      }
      if (!addForm.fatherName.trim()) {
        setAddError("Father's / Husband's name is mandatory.")

        return
      }
      if (!addForm.aadhaarNumber.trim() || !/^\d{12}$/.test(addForm.aadhaarNumber.trim())) {
        setAddError('A valid 12-digit Aadhaar number is mandatory.')

        return
      }
      if (!addForm.address.trim()) {
        setAddError('Complete postal address is mandatory.')

        return
      }
      if (!addForm.mobileNumber.trim() || addForm.mobileNumber.trim().replace(/\D/g, '').length !== 10) {
        setAddError('A valid 10-digit mobile number is mandatory.')

        return
      }
      if (!addForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) {
        setAddError('A valid email address is mandatory.')

        return
      }
      if (!addForm.workPurpose.trim()) {
        setAddError('Purpose of stall / activity is mandatory.')

        return
      }
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
          newCategoryFee: addForm.newCategoryFee.trim(),
          direction: addForm.direction.trim() || null,
          isDirectAllotment: addForm.isDirectAllotment,
          allotteeName: addForm.allotteeName.trim(),
          fatherName: addForm.fatherName.trim(),
          aadhaarNumber: addForm.aadhaarNumber.trim(),
          contactPerson: addForm.contactPerson.trim() || null,
          address: addForm.address.trim(),
          mobileNumber: addForm.mobileNumber.trim(),
          email: addForm.email.trim(),
          workPurpose: addForm.workPurpose.trim(),
          notes: addForm.notes.trim() || null,
          sendNotification: addForm.sendNotification
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
          emdAmountPaise: body.emdAmountPaise ?? null,
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
      {/* Navigation Tabs with Live Counts */}
      <div className='border-b bg-muted/20 px-4 pt-2.5 pb-0'>
        <div className='flex gap-2 sm:gap-6 overflow-x-auto'>
          <button
            type='button'
            onClick={() => { setStallCategoryTab('all'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
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
            onClick={() => { setStallCategoryTab('available'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              stallCategoryTab === 'available'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Available
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'available' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {tabCounts.available}
            </span>
          </button>

          <button
            type='button'
            onClick={() => { setStallCategoryTab('allotted'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              stallCategoryTab === 'allotted'
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Allotted
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'allotted' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
            }`}>
              {tabCounts.allotted}
            </span>
          </button>

          <button
            type='button'
            onClick={() => { setStallCategoryTab('public'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
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
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              stallCategoryTab === 'direct'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Direct Allotment
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'direct' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
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
                            newCategoryName: '',
                            newCategoryFee: ''
                          }))}
                          className='text-xs text-primary font-medium hover:underline'
                        >
                          {addForm.categoryMode === 'existing' ? '+ Create New Category' : '← Select Existing'}
                        </button>
                      </div>
                      {addForm.categoryMode === 'existing' ? (
                        <>
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
                          <p className='text-[11px] text-muted-foreground'>
                            💡 Category pricing is managed in <strong>Settings &gt; Category Configuration</strong>. Stalls added to this category automatically share the same pricing.
                          </p>
                        </>
                      ) : (
                        <div className='space-y-2.5'>
                          <Input
                            value={addForm.newCategoryName}
                            onChange={e => setAddForm(prev => ({ ...prev, newCategoryName: e.target.value }))}
                            placeholder='New Category Name (e.g. VIP Enclosure / Govt Pavilions)'
                            autoFocus
                          />
                          <div className='grid gap-1'>
                            <Label htmlFor='add-new-cat-fee' className='text-xs font-semibold'>
                              Initial Stall / Allotment Amount in ₹ (optional)
                            </Label>
                            <Input
                              id='add-new-cat-fee'
                              type='number'
                              min='0'
                              value={addForm.newCategoryFee}
                              onChange={e => setAddForm(prev => ({ ...prev, newCategoryFee: e.target.value }))}
                              placeholder='e.g. 30000'
                            />
                            <p className='text-[11px] text-muted-foreground'>
                              💡 Note: You can manage and update category fees, GST, and payment deadlines anytime from <strong>Settings &gt; Category Configuration</strong>. Future stalls added to this category will automatically share this price.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className='grid gap-1.5'>
                      <Label htmlFor='add-direction'>Direction (optional)</Label>
                      <Input
                        id='add-direction'
                        value={addForm.direction}
                        onChange={e => setAddForm(prev => ({ ...prev, direction: e.target.value }))}
                        placeholder='e.g. North / Food Court Zone A'
                      />
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
                          <div className='grid sm:grid-cols-2 gap-3'>
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

                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-father-name' className='text-xs font-semibold'>
                                Father&apos;s / Husband&apos;s Name <span className='text-destructive'>*</span>
                              </Label>
                              <Input
                                id='add-father-name'
                                value={addForm.fatherName}
                                onChange={e => setAddForm(prev => ({ ...prev, fatherName: e.target.value }))}
                                placeholder='e.g. Shri Ram Kumar'
                              />
                            </div>
                          </div>

                          <div className='grid sm:grid-cols-2 gap-3'>
                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-aadhaar' className='text-xs font-semibold'>
                                Aadhaar Card Number (12 digits) <span className='text-destructive'>*</span>
                              </Label>
                              <Input
                                id='add-aadhaar'
                                maxLength={12}
                                value={addForm.aadhaarNumber}
                                onChange={e => setAddForm(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                                placeholder='12-digit Aadhaar'
                              />
                            </div>

                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-contact-person' className='text-xs font-semibold'>
                                Contact Person (optional)
                              </Label>
                              <Input
                                id='add-contact-person'
                                value={addForm.contactPerson}
                                onChange={e => setAddForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                                placeholder='e.g. Ramesh Kumar'
                              />
                            </div>
                          </div>

                          <div className='grid gap-1.5'>
                            <Label htmlFor='add-address' className='text-xs font-semibold'>
                              Complete Postal Address <span className='text-destructive'>*</span>
                            </Label>
                            <Input
                              id='add-address'
                              value={addForm.address}
                              onChange={e => setAddForm(prev => ({ ...prev, address: e.target.value }))}
                              placeholder='Building, Street, City, State, PIN'
                            />
                          </div>

                          <div className='grid sm:grid-cols-2 gap-3'>
                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-mobile' className='text-xs font-semibold'>
                                Mobile Number (10 digits) <span className='text-destructive'>*</span>
                              </Label>
                              <Input
                                id='add-mobile'
                                maxLength={10}
                                value={addForm.mobileNumber}
                                onChange={e => setAddForm(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                placeholder='e.g. 9876543210'
                              />
                            </div>

                            <div className='grid gap-1.5'>
                              <Label htmlFor='add-email' className='text-xs font-semibold'>
                                Email Address <span className='text-destructive'>*</span>
                              </Label>
                              <Input
                                id='add-email'
                                type='email'
                                value={addForm.email}
                                onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder='allottee@example.com'
                              />
                            </div>
                          </div>

                          <div className='grid gap-1.5'>
                            <Label htmlFor='add-purpose' className='text-xs font-semibold'>
                              Purpose of Stall / Activity <span className='text-destructive'>*</span>
                            </Label>
                            <Input
                              id='add-purpose'
                              value={addForm.workPurpose}
                              onChange={e => setAddForm(prev => ({ ...prev, workPurpose: e.target.value }))}
                              placeholder='e.g. Handicraft exhibition &amp; sales'
                            />
                          </div>

                          <div className='grid gap-1.5'>
                            <Label htmlFor='add-notes' className='text-xs font-semibold'>
                              Allotment Note / Memo Ref (optional)
                            </Label>
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
                <TableHead>Stall Amount</TableHead>
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
                      <div className='flex items-center gap-1.5'>
                        {row.status === 'allotted' && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1'
                            title='Cancel Allotment'
                            onClick={() => {
                              setCancelError(null)
                              setCancelReason('')
                              setCancelSendNotification(true)
                              setCancellingAllotmentRow(row)
                            }}
                          >
                            <BanIcon className='size-3.5' /> Cancel Allotment
                          </Button>
                        )}

                        {row.status === 'available' && (
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50 hover:text-purple-800 gap-1'
                            title='Direct Allot / Re-allocate'
                            onClick={() => openDirectAllotRowDialog(row)}
                          >
                            <UserPlusIcon className='size-3.5' /> Re-allocate
                          </Button>
                        )}

                        {row.status !== 'allotted' && (
                          <>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='size-7 text-muted-foreground hover:bg-slate-100 hover:text-[#0c2847]'
                              onClick={() => openEditDialog(row)}
                            >
                              <PencilIcon className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='size-7 text-red-600 hover:bg-red-50 hover:text-red-700'
                              onClick={() => {
                                setError(null)
                                setDeletingSingle(row)
                              }}
                            >
                              <Trash2Icon className='size-3.5' />
                            </Button>
                          </>
                        )}
                      </div>
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
              <Label htmlFor='edit-emd'>Stall Amount in ₹ (optional)</Label>
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

      {/* Cancel Allotment Confirmation Dialog */}
      <Dialog
        open={cancellingAllotmentRow !== null}
        onOpenChange={open => !open && !isCancellingAllotment && setCancellingAllotmentRow(null)}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-destructive'>
              <AlertTriangleIcon className='size-5 text-red-600' /> Cancel Stall Allotment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the allotment for Booth/Stall{' '}
              <span className='font-bold text-foreground'>{cancellingAllotmentRow?.stallNumber}</span>?
            </DialogDescription>
          </DialogHeader>

          {cancellingAllotmentRow?.applicationNumber && (
            <div className='rounded-md border bg-slate-50 p-2.5 text-xs text-slate-700'>
              <span className='font-semibold'>Currently Allotted To:</span>{' '}
              <span className='font-mono font-bold'>{cancellingAllotmentRow.applicationNumber}</span>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                The stall will be released immediately and become available for re-allocation.
              </p>
            </div>
          )}

          <div className='space-y-3 py-2'>
            <div className='grid gap-1.5'>
              <Label htmlFor='cancel-reason' className='text-xs'>
                Reason for Cancellation (optional)
              </Label>
              <Input
                id='cancel-reason'
                placeholder='e.g. Applicant surrendered, non-payment, administrative order'
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>

            <div className='flex items-center space-x-2 rounded-md border p-2.5 bg-slate-50'>
              <Checkbox
                id='cancel-notif'
                checked={cancelSendNotification}
                onCheckedChange={checked => setCancelSendNotification(checked === true)}
              />
              <label htmlFor='cancel-notif' className='text-xs font-medium cursor-pointer select-none text-slate-800'>
                Send cancellation update via WhatsApp &amp; Email
              </label>
            </div>

            {cancelError && (
              <Alert variant='destructive'>
                <AlertDescription>{cancelError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setCancellingAllotmentRow(null)}
              disabled={isCancellingAllotment}
            >
              Close
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleConfirmCancelAllotment}
              disabled={isCancellingAllotment}
            >
              {isCancellingAllotment && <Loader2Icon className='mr-1.5 size-4 animate-spin' />}
              Confirm Cancel Allotment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Re-allocate / Allot Dialog */}
      <Dialog
        open={allottingRow !== null}
        onOpenChange={open => !open && !isSubmittingAllot && setAllottingRow(null)}
      >
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-purple-900'>
              <UserPlusIcon className='size-5 text-purple-700' /> Re-allocate Booth/Stall {allottingRow?.stallNumber}
            </DialogTitle>
            <DialogDescription>
              Directly allot this stall to an organisation or applicant with official record and notifications.
            </DialogDescription>
          </DialogHeader>

          {allottingRow && (
            <div className='flex flex-wrap items-center gap-2 rounded-md border bg-purple-50/50 p-2.5 text-xs text-purple-900'>
              <span className='font-bold'>Category:</span>
              <span>{allottingRow.categoryName}</span>
              <span>·</span>
              <span className='font-bold'>Type:</span>
              <span className='capitalize'>{allottingRow.shopType}</span>
              {allottingRow.direction && (
                <>
                  <span>·</span>
                  <span className='font-bold'>Direction:</span>
                  <span>{allottingRow.direction}</span>
                </>
              )}
            </div>
          )}

          <div className='grid gap-4 py-2'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label htmlFor='allot-name'>Organisation / Allottee Name *</Label>
                <Input
                  id='allot-name'
                  placeholder='e.g. Haryana Handlooms'
                  value={allotForm.allotteeName}
                  onChange={e => setAllotForm(prev => ({ ...prev, allotteeName: e.target.value }))}
                />
              </div>

              <div className='grid gap-1.5'>
                <Label htmlFor='allot-father'>Father&apos;s Name *</Label>
                <Input
                  id='allot-father'
                  placeholder='Father / Guardian name'
                  value={allotForm.fatherName}
                  onChange={e => setAllotForm(prev => ({ ...prev, fatherName: e.target.value }))}
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label htmlFor='allot-aadhaar'>Aadhaar Number (12 digits) *</Label>
                <Input
                  id='allot-aadhaar'
                  placeholder='12-digit Aadhaar'
                  maxLength={12}
                  value={allotForm.aadhaarNumber}
                  onChange={e => setAllotForm(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '') }))}
                />
              </div>

              <div className='grid gap-1.5'>
                <Label htmlFor='allot-contact'>Contact Person (optional)</Label>
                <Input
                  id='allot-contact'
                  placeholder='Representative if different'
                  value={allotForm.contactPerson}
                  onChange={e => setAllotForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                />
              </div>
            </div>

            <div className='grid gap-1.5'>
              <Label htmlFor='allot-address'>Full Address *</Label>
              <Input
                id='allot-address'
                placeholder='Village / Street, Tehsil, District, State'
                value={allotForm.address}
                onChange={e => setAllotForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label htmlFor='allot-mobile'>Mobile Number (10 digits) *</Label>
                <Input
                  id='allot-mobile'
                  placeholder='10-digit Indian Mobile'
                  maxLength={10}
                  value={allotForm.mobileNumber}
                  onChange={e => setAllotForm(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                />
              </div>

              <div className='grid gap-1.5'>
                <Label htmlFor='allot-email'>Email Address *</Label>
                <Input
                  id='allot-email'
                  type='email'
                  placeholder='allottee@example.com'
                  value={allotForm.email}
                  onChange={e => setAllotForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className='grid gap-1.5'>
              <Label htmlFor='allot-purpose'>Purpose of Stall / Activity *</Label>
              <Input
                id='allot-purpose'
                placeholder='e.g. Handloom exhibition and retail sales'
                value={allotForm.workPurpose}
                onChange={e => setAllotForm(prev => ({ ...prev, workPurpose: e.target.value }))}
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label htmlFor='allot-fee'>Stall Amount / Fee in ₹</Label>
                <Input
                  id='allot-fee'
                  type='number'
                  min='0'
                  placeholder='0'
                  value={allotForm.paymentAmountRupees}
                  onChange={e => setAllotForm(prev => ({ ...prev, paymentAmountRupees: e.target.value }))}
                />
                <p className='text-[11px] text-muted-foreground'>
                  If 0, stall is allotted immediately. If &gt; 0, payment link is generated.
                </p>
              </div>

              <div className='grid gap-1.5'>
                <Label htmlFor='allot-notes'>Internal Note (optional)</Label>
                <Input
                  id='allot-notes'
                  placeholder='Remarks or memo reference'
                  value={allotForm.notes}
                  onChange={e => setAllotForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            {allotError && (
              <Alert variant='destructive'>
                <AlertDescription>{allotError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setAllottingRow(null)}
              disabled={isSubmittingAllot}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleDirectAllotSubmit}
              disabled={isSubmittingAllot}
            >
              {isSubmittingAllot && <Loader2Icon className='mr-1.5 size-4 animate-spin' />}
              Confirm Allotment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InventoryTable
