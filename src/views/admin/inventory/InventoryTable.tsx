'use client'

import { useMemo, useState } from 'react'

import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpDownIcon,
  BanIcon,
  BellRingIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  HistoryIcon,
  InfoIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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
  applicationId: number | null
  isDirectAllotment?: boolean
  paymentStatus?: string | null
  paymentAmountPaise?: number | null
  isCancelled?: boolean
  cancelReason?: string | null
  allotmentPaymentDeadlineAt?: string | null
  isPaymentOverdue?: boolean
  createdAt: string
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
  isDirectAllotment: boolean
  allotteeName: string
  fatherName: string
  aadhaarNumber: string
  address: string
  mobileNumber: string
  email: string
  workPurpose: string
  notes: string
  sendNotification: boolean
}

const EMPTY_FORM: StallFormState = {
  stallNumber: '',
  shopType: '',
  categoryName: '',
  direction: '',
  emdAmount: '',
  status: 'available',
  isDirectAllotment: false,
  allotteeName: '',
  fatherName: '',
  aadhaarNumber: '',
  address: '',
  mobileNumber: '',
  email: '',
  workPurpose: '',
  notes: '',
  sendNotification: true
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
  const [stallCategoryTab, setStallCategoryTab] = useState<'all' | 'available' | 'allotted' | 'public' | 'direct' | 'cancelled'>('all')
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [directionFilter, setDirectionFilter] = useState(ALL)
  type SortColumn = 'stallNumber' | 'shopType' | 'categoryName' | 'direction' | 'amount' | 'status' | 'createdAt'
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const tabCounts = useMemo(() => {
    const total = rows.length
    const available = rows.filter(r => r.status === 'available' && !r.isCancelled).length
    const allotted = rows.filter(r => r.status === 'allotted' && !r.isDirectAllotment && !r.isCancelled).length
    const direct = rows.filter(r => Boolean(r.isDirectAllotment) && !r.isCancelled && r.status !== 'cancelled').length
    const publicStalls = rows.filter(r => !r.isDirectAllotment && !r.isCancelled && r.status !== 'cancelled').length
    const cancelled = rows.filter(r => Boolean(r.isCancelled) || r.status === 'cancelled').length

    return { total, available, allotted, direct, public: publicStalls, cancelled }
  }, [rows])

  type HistoryItem = {
    id: string
    timestamp: string
    action: string
    title: string
    description: string
    actorName?: string | null
    badgeColor: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
  }
  const [historyRow, setHistoryRow] = useState<ShopUnitRowData | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<HistoryItem[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  const openHistoryDialog = async (row: ShopUnitRowData) => {
    setHistoryRow(row)
    setHistoryLoading(true)
    setHistoryError(null)
    setHistoryEvents([])

    try {
      const res = await fetch(`/api/admin/inventory/${row.id}/history`)
      const data = await res.json()
      if (!res.ok) {
        setHistoryError(data.error ?? 'Failed to load history.')
        return
      }
      setHistoryEvents(data.history || [])
    } catch {
      setHistoryError('Network error loading history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null)
  const [reminderToast, setReminderToast] = useState<string | null>(null)

  const handleSendReminder = async (row: ShopUnitRowData) => {
    if (!row.applicationId) return
    setIsSendingReminder(row.id)
    setReminderToast(null)

    try {
      const res = await fetch(`/api/admin/applications/${row.applicationId}/send-payment-reminder`, {
        method: 'POST'
      })
      const data = await res.json()
      if (res.ok) {
        setReminderToast(`Payment reminder dispatched to ${row.applicationNumber || 'applicant'}!`)
        setTimeout(() => setReminderToast(null), 4000)
      } else {
        alert(data.error ?? 'Failed to send payment reminder.')
      }
    } catch {
      alert('Error sending payment reminder.')
    } finally {
      setIsSendingReminder(null)
    }
  }

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

    const filtered = rows.filter(row => {
      // Tab filter: all vs available vs allotted by draw vs public/draw vs direct entry vs cancelled
      if (stallCategoryTab === 'cancelled' && !row.isCancelled && row.status !== 'cancelled') return false
      if (stallCategoryTab === 'available' && (row.status !== 'available' || row.isCancelled)) return false
      if (stallCategoryTab === 'allotted' && (row.status !== 'allotted' || row.isDirectAllotment || row.isCancelled)) return false
      if (stallCategoryTab === 'direct' && (!row.isDirectAllotment || row.isCancelled || row.status === 'cancelled')) return false
      if (stallCategoryTab === 'public' && (row.isDirectAllotment || row.isCancelled || row.status === 'cancelled')) return false

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

    const sorted = [...filtered]
    const dir = sortDirection === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      switch (sortColumn) {
        case 'stallNumber':
          return dir * a.stallNumber.localeCompare(b.stallNumber, undefined, { numeric: true })
        case 'shopType':
          return dir * a.shopType.localeCompare(b.shopType)
        case 'categoryName':
          return dir * a.categoryName.localeCompare(b.categoryName)
        case 'direction':
          return dir * (a.direction ?? '').localeCompare(b.direction ?? '')
        case 'amount': {
          const aAmount = a.paymentAmountPaise ?? a.emdAmountPaise ?? 0
          const bAmount = b.paymentAmountPaise ?? b.emdAmountPaise ?? 0

          return dir * (aAmount - bAmount)
        }
        case 'status':
          return dir * a.status.localeCompare(b.status)
        case 'createdAt':
        default:
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
    })

    return sorted
  }, [rows, stallCategoryTab, search, categoryFilter, statusFilter, typeFilter, directionFilter, sortColumn, sortDirection])

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
      status: row.status,
      isDirectAllotment: Boolean(row.isDirectAllotment),
      allotteeName: row.applicationNumber ? row.applicationNumber : '',
      fatherName: '',
      aadhaarNumber: '',
      address: '',
      mobileNumber: '',
      email: '',
      workPurpose: '',
      notes: '',
      sendNotification: true
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
          applicationId: body.applicationId ?? null,
          isDirectAllotment: addForm.isDirectAllotment,
          paymentStatus: body.paymentStatus ?? null,
          paymentAmountPaise: body.paymentAmountPaise ?? null,
          isCancelled: false,
          createdAt: body.createdAt ?? new Date().toISOString()
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

    const isDoingDirectAllotment = editForm.isDirectAllotment && editingRow.status === 'available'

    if (isDoingDirectAllotment) {
      if (!editForm.allotteeName.trim()) {
        setEditError('Organisation / Allottee name is mandatory.')
        return
      }
      if (!editForm.fatherName.trim()) {
        setEditError("Father's / Husband's name is mandatory.")
        return
      }
      if (!editForm.aadhaarNumber.trim() || !/^\d{12}$/.test(editForm.aadhaarNumber.trim())) {
        setEditError('A valid 12-digit Aadhaar number is mandatory.')
        return
      }
      if (!editForm.address.trim()) {
        setEditError('Complete postal address is mandatory.')
        return
      }
      if (!editForm.mobileNumber.trim() || editForm.mobileNumber.trim().replace(/\D/g, '').length !== 10) {
        setEditError('A valid 10-digit mobile number is mandatory.')
        return
      }
      if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
        setEditError('A valid email address is mandatory.')
        return
      }
      if (!editForm.workPurpose.trim()) {
        setEditError('Purpose of stall / activity is mandatory.')
        return
      }
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

      if (isDoingDirectAllotment) {
        const allotRes = await fetch(`/api/admin/inventory/${editingRow.id}/direct-allot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allotteeName: editForm.allotteeName.trim(),
            fatherName: editForm.fatherName.trim(),
            aadhaarNumber: editForm.aadhaarNumber.trim(),
            address: editForm.address.trim(),
            mobileNumber: editForm.mobileNumber.trim(),
            email: editForm.email.trim(),
            workPurpose: editForm.workPurpose.trim(),
            notes: editForm.notes.trim() || null,
            paymentAmountRupees: editForm.emdAmount.trim() ? Number(editForm.emdAmount) : 0,
            sendNotification: editForm.sendNotification
          })
        })

        const allotData = await allotRes.json()
        if (!allotRes.ok) {
          setEditError(allotData.error ?? 'Stall updated, but Direct Allotment failed.')
          return
        }

        setRows(prev =>
          prev.map(r =>
            r.id === editingRow.id
              ? {
                  ...r,
                  stallNumber: editForm.stallNumber.trim(),
                  shopType: editForm.shopType as 'single' | 'double',
                  categoryName: editForm.categoryName,
                  direction: editForm.direction.trim() || null,
                  status: allotData.shopStatus || 'allotted',
                  isDirectAllotment: true,
                  applicationNumber: allotData.applicationNumber || editForm.allotteeName.trim(),
                  applicationId: allotData.applicationId ?? r.applicationId,
                  paymentStatus: allotData.paymentStatus || (Number(editForm.emdAmount) > 0 ? 'pending' : 'not_required'),
                  paymentAmountPaise: Math.round(Number(editForm.emdAmount || 0) * 100)
                }
              : r
          )
        )
      } else {
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
      }

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
    <Card className='shadow-xs w-full min-w-0 overflow-hidden'>
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
            Allotted by Draw
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

          <button
            type='button'
            onClick={() => { setStallCategoryTab('cancelled'); setPage(1) }}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              stallCategoryTab === 'cancelled'
                ? 'border-red-600 text-red-700 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Cancelled
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              stallCategoryTab === 'cancelled' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800'
            }`}>
              {tabCounts.cancelled}
            </span>
          </button>
        </div>
      </div>

      {reminderToast && (
        <div className='mx-6 my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md text-xs font-medium flex items-center justify-between shadow-2xs'>
          <span className='flex items-center gap-2'>
            <CheckCircle2Icon className='size-4 text-emerald-600 shrink-0' />
            {reminderToast}
          </span>
          <button
            type='button'
            onClick={() => setReminderToast(null)}
            className='text-emerald-700 font-bold hover:text-emerald-950 px-1 text-sm'
          >
            ✕
          </button>
        </div>
      )}

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
                <DialogContent className='sm:max-w-3xl max-h-[92vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>Add Booth/Stall Unit</DialogTitle>
                    <DialogDescription>
                      Create a booth/stall unit in inventory. Optionally assign directly to an allottee.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Allotment Guidelines Banner */}
                  <div className='rounded-lg border border-[#0c2847]/15 bg-[#0c2847]/[0.03] p-3 text-xs text-slate-800'>
                    <div className='flex items-center gap-2 font-semibold text-[#0c2847] mb-2'>
                      <InfoIcon className='size-4 text-[#0c2847] shrink-0' />
                      <span>Allotment Guidelines &amp; Rules</span>
                    </div>
                    <div className='grid gap-2 sm:grid-cols-3 text-[11px] leading-relaxed'>
                      <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                        <span className='font-bold text-[#0c2847] block mb-0.5'>Public / Draw Stalls</span>
                        <span className='text-slate-600'>Direct Allotment OFF: Stalls are pooled for verified applicants via the automated Draw Process.</span>
                      </div>
                      <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                        <span className='font-bold text-[#0c2847] block mb-0.5'>Direct Allotment</span>
                        <span className='text-slate-600'>Direct Allotment ON: Assigned directly to an organisation or applicant without participating in the public draw.</span>
                      </div>
                      <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                        <span className='font-bold text-[#0c2847] block mb-0.5'>Fee &amp; Allotment Letter</span>
                        <span className='text-slate-600'>If fee is ₹0, the official Allotment Letter is dispatched immediately. If fee &gt; ₹0, a secure payment link is sent first.</span>
                      </div>
                    </div>
                  </div>

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
                            Category pricing is managed in <strong>Settings &gt; Category Configuration</strong>. Stalls added to this category automatically share the same pricing.
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
                              Note: You can manage and update category fees, GST, and payment deadlines anytime from <strong>Settings &gt; Category Configuration</strong>. Future stalls added to this category will automatically share this price.
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
                            <p className='text-[11px] text-muted-foreground'>
                              Official 12-digit UID of allottee for verification.
                            </p>
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
      <CardContent className='p-0 w-full min-w-0'>
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
          <Table className='min-w-[1000px]'>
            <TableHeader>
              <TableRow>
                {canManage && (
                  <TableHead className='w-10'>
                    <Checkbox checked={allSelected} onCheckedChange={checked => toggleAll(checked === true)} aria-label='Select all' />
                  </TableHead>
                )}
                {([
                  ['stallNumber', 'Booth/Stall No.'],
                  ['shopType', 'Type'],
                  ['categoryName', 'Category'],
                  ['direction', 'Direction'],
                  ['amount', 'Stall Amount'],
                  ['status', 'Status']
                ] as [SortColumn, string][]).map(([column, label]) => (
                  <TableHead key={column}>
                    <button
                      type='button'
                      onClick={() => toggleSort(column)}
                      className='inline-flex items-center gap-1 hover:text-foreground'
                    >
                      {label}
                      {sortColumn === column ? (
                        sortDirection === 'asc' ? (
                          <ArrowUpIcon className='size-3' />
                        ) : (
                          <ArrowDownIcon className='size-3' />
                        )
                      ) : (
                        <ArrowUpDownIcon className='size-3 opacity-40' />
                      )}
                    </button>
                  </TableHead>
                ))}
                <TableHead>Allotted To</TableHead>
                <TableHead>
                  <button
                    type='button'
                    onClick={() => toggleSort('createdAt')}
                    className='inline-flex items-center gap-1 hover:text-foreground'
                  >
                    Created
                    {sortColumn === 'createdAt' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUpIcon className='size-3' />
                      ) : (
                        <ArrowDownIcon className='size-3' />
                      )
                    ) : (
                      <ArrowUpDownIcon className='size-3 opacity-40' />
                    )}
                  </button>
                </TableHead>
                {canManage && <TableHead className='text-right min-w-[160px]'>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(row => (
                <TableRow key={row.id}>
                  {canManage && (
                    <TableCell>
                      {row.status !== 'allotted' && !row.isCancelled && (
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
                    <div className='flex flex-col gap-1'>
                      <span className='font-medium text-slate-800 dark:text-slate-200'>
                        {row.emdAmountPaise !== null ? `₹${(row.emdAmountPaise / 100).toLocaleString('en-IN')}` : '—'}
                      </span>
                      {row.isPaymentOverdue && (
                        <Badge variant='destructive' className='bg-red-600 text-white text-[10px] px-1.5 py-0 w-fit gap-1 font-bold animate-pulse'>
                          <ClockIcon className='size-2.5' /> Overdue
                        </Badge>
                      )}
                      {!row.isPaymentOverdue && (row.paymentStatus === 'success' || row.paymentStatus === 'paid') && (
                        <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-1.5 py-0 w-fit gap-1 font-semibold'>
                          <CheckCircle2Icon className='size-2.5' /> Paid (₹{((row.paymentAmountPaise || row.emdAmountPaise || 0) / 100).toLocaleString('en-IN')})
                        </Badge>
                      )}
                      {!row.isPaymentOverdue && (row.paymentStatus === 'pending' || row.paymentStatus === 'initiated') && (
                        <Badge className='bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 w-fit gap-1 font-semibold'>
                          <ClockIcon className='size-2.5' /> Pending
                        </Badge>
                      )}
                      {!row.isPaymentOverdue && row.isDirectAllotment && (row.paymentAmountPaise === 0 || !row.paymentAmountPaise) && row.status === 'allotted' && (
                        <Badge className='bg-slate-600 text-white text-[10px] px-1.5 py-0 w-fit font-medium'>
                          Free Allotment
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.isCancelled || row.status === 'cancelled' ? (
                      <div className='flex flex-col gap-1'>
                        <Badge className='bg-red-100 text-red-800 border-red-300 w-fit font-bold'>
                          Cancelled
                        </Badge>
                        {row.cancelReason && (
                          <span className='text-[10px] text-muted-foreground truncate max-w-[130px]' title={row.cancelReason}>
                            {row.cancelReason}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <Badge className={STATUS_CONFIG[row.status].color}>{STATUS_CONFIG[row.status].label}</Badge>
                      </div>
                    )}
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
                  <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
                    {new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className='flex flex-nowrap items-center gap-1 justify-end'>
                        {/* Actions dropdown: Re-allocate, Cancel, Reminder, and the
                            Downloads (Application/Receipt/Letter) submenu items — grouped
                            into one menu so the row's visible buttons never wrap onto a
                            second line regardless of how many are applicable at once. */}
                        {(() => {
                          const hasReceipt = Boolean(
                            row.applicationId && (row.paymentStatus === 'success' || row.paymentStatus === 'paid')
                          )
                          const hasLetter = Boolean(
                            row.applicationId &&
                              !row.isCancelled &&
                              row.status !== 'cancelled' &&
                              (row.status === 'allotted' ||
                                row.paymentStatus === 'success' ||
                                row.paymentStatus === 'paid' ||
                                (row.isDirectAllotment && !row.paymentAmountPaise))
                          )
                          const hasApplication = Boolean(row.applicationId)
                          const canReallocate = row.isCancelled || row.status === 'cancelled'
                          const canCancel = row.status === 'allotted' && !row.isCancelled
                          const canRemind = Boolean(
                            row.applicationId &&
                              !row.isCancelled &&
                              row.status !== 'cancelled' &&
                              (row.paymentStatus === 'pending' ||
                                row.paymentStatus === 'initiated' ||
                                row.isPaymentOverdue ||
                                row.status === 'reserved')
                          )

                          if (!hasReceipt && !hasLetter && !hasApplication && !canReallocate && !canCancel && !canRemind) {
                            return null
                          }

                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='h-7 px-2 text-xs font-medium text-slate-700 border-slate-300 hover:bg-slate-50 gap-1 shrink-0'
                                  >
                                    Actions <ChevronDownIcon className='size-3' />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align='end' className='w-52'>
                                {canReallocate && (
                                  <DropdownMenuItem
                                    className='whitespace-nowrap text-purple-700'
                                    onClick={() => openDirectAllotRowDialog(row)}
                                  >
                                    <UserPlusIcon className='size-3.5' /> Re-allocate
                                  </DropdownMenuItem>
                                )}
                                {canCancel && (
                                  <DropdownMenuItem
                                    className='whitespace-nowrap text-red-600'
                                    onClick={() => {
                                      setCancelError(null)
                                      setCancelReason('')
                                      setCancelSendNotification(true)
                                      setCancellingAllotmentRow(row)
                                    }}
                                  >
                                    <BanIcon className='size-3.5' /> Cancel Allotment
                                  </DropdownMenuItem>
                                )}
                                {canRemind && (
                                  <DropdownMenuItem
                                    className='whitespace-nowrap text-amber-700'
                                    disabled={isSendingReminder === row.id}
                                    onClick={() => handleSendReminder(row)}
                                  >
                                    {isSendingReminder === row.id ? (
                                      <Loader2Icon className='size-3.5 animate-spin' />
                                    ) : (
                                      <BellRingIcon className='size-3.5' />
                                    )}
                                    Send Reminder
                                  </DropdownMenuItem>
                                )}
                                {hasApplication && (
                                  <DropdownMenuItem
                                    className='whitespace-nowrap'
                                    render={
                                      <a
                                        href={`/api/admin/applications/${row.applicationId}/summary/pdf`}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                      />
                                    }
                                  >
                                    <FileTextIcon className='size-3.5' /> Application Form
                                  </DropdownMenuItem>
                                )}
                                {hasReceipt && (
                                  <DropdownMenuItem
                                    className='whitespace-nowrap'
                                    render={
                                      <a
                                        href={`/api/admin/applications/${row.applicationId}/receipt/pdf`}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                      />
                                    }
                                  >
                                    <PrinterIcon className='size-3.5' /> Payment Receipt
                                  </DropdownMenuItem>
                                )}
                                {hasLetter && (
                                  <DropdownMenuItem
                                    className='whitespace-nowrap'
                                    render={
                                      <a
                                        href={`/api/admin/applications/${row.applicationId}/allotment-letter/pdf`}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                      />
                                    }
                                  >
                                    <FileTextIcon className='size-3.5' /> Allotment Letter
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        })()}

                        {/* History: always visible, icon-only */}
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='size-7 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shrink-0'
                          title='View Stall History Timeline'
                          onClick={() => openHistoryDialog(row)}
                        >
                          <HistoryIcon className='size-3.5' />
                        </Button>

                        {/* Edit & Delete: always visible, icon-only, for unallotted/uncancelled stalls */}
                        {row.status !== 'allotted' && !row.isCancelled && (
                          <>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='size-7 text-muted-foreground hover:bg-slate-100 hover:text-[#0c2847] shrink-0'
                              title='Edit Stall Details'
                              onClick={() => openEditDialog(row)}
                            >
                              <PencilIcon className='size-3.5' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='size-7 text-red-600 hover:bg-red-50 hover:text-red-700 shrink-0'
                              title='Delete Stall'
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
        <DialogContent className='sm:max-w-3xl max-h-[92vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Edit Booth/Stall Unit {editingRow?.stallNumber}</DialogTitle>
            <DialogDescription>Update this booth/stall unit&apos;s details and allotment configuration.</DialogDescription>
          </DialogHeader>

          {/* Allotment Guidelines Banner */}
          <div className='rounded-lg border border-[#0c2847]/15 bg-[#0c2847]/[0.03] p-3 text-xs text-slate-800'>
            <div className='flex items-center gap-2 font-semibold text-[#0c2847] mb-2'>
              <InfoIcon className='size-4 text-[#0c2847] shrink-0' />
              <span>Editing Guidelines &amp; Rules</span>
            </div>
            <div className='grid gap-2 sm:grid-cols-3 text-[11px] leading-relaxed'>
              <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                <span className='font-bold text-[#0c2847] block mb-0.5'>Stall Details</span>
                <span className='text-slate-600'>Update stall number, type, category, and physical location direction.</span>
              </div>
              <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                <span className='font-bold text-[#0c2847] block mb-0.5'>Fee Protection</span>
                <span className='text-slate-600'>Stall fee is protected once allotted. Modifying stall details maintains financial audit history.</span>
              </div>
              <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                <span className='font-bold text-[#0c2847] block mb-0.5'>Direct Allotment in Edit</span>
                <span className='text-slate-600'>Available stalls can be assigned directly. If fee is ₹0, the Allotment Letter is issued immediately.</span>
              </div>
            </div>
          </div>

          <div className='grid gap-4 py-1'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='grid gap-1.5'>
                <Label htmlFor='edit-stall-number'>Booth/Stall Number <span className='text-destructive'>*</span></Label>
                <Input
                  id='edit-stall-number'
                  value={editForm.stallNumber}
                  onChange={e => setEditForm(prev => ({ ...prev, stallNumber: e.target.value }))}
                  placeholder='e.g. A-101'
                />
              </div>

              <div className='grid gap-1.5'>
                <Label>Type <span className='text-destructive'>*</span></Label>
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
            </div>

            <div className='grid gap-1.5'>
              <Label>Category <span className='text-destructive'>*</span></Label>
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
              <p className='text-[11px] text-muted-foreground'>
                Stalls in this category share the same base category pricing and draw configurations.
              </p>
            </div>

            <div className='grid gap-1.5'>
              <Label htmlFor='edit-direction'>Direction (optional)</Label>
              <Input
                id='edit-direction'
                value={editForm.direction}
                onChange={e => setEditForm(prev => ({ ...prev, direction: e.target.value }))}
                placeholder='e.g. North / Food Court Zone A'
              />
            </div>

            <div className='grid gap-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='edit-emd'>Stall Amount in ₹</Label>
                {Boolean(
                  editingRow?.status === 'allotted' ||
                  editingRow?.paymentStatus === 'success' ||
                  editingRow?.paymentStatus === 'paid' ||
                  editingRow?.isDirectAllotment ||
                  (editingRow?.paymentAmountPaise !== undefined && editingRow.paymentAmountPaise !== null && editingRow.paymentAmountPaise > 0)
                ) && (
                  <span className='text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded'>
                    Locked
                  </span>
                )}
              </div>
              <Input
                id='edit-emd'
                type='number'
                min='0'
                value={editForm.emdAmount}
                disabled={Boolean(
                  editingRow?.status === 'allotted' ||
                  editingRow?.paymentStatus === 'success' ||
                  editingRow?.paymentStatus === 'paid' ||
                  editingRow?.isDirectAllotment ||
                  (editingRow?.paymentAmountPaise !== undefined && editingRow.paymentAmountPaise !== null && editingRow.paymentAmountPaise > 0)
                )}
                onChange={e => setEditForm(prev => ({ ...prev, emdAmount: e.target.value }))}
                className={
                  editingRow?.status === 'allotted' ||
                  editingRow?.paymentStatus === 'success' ||
                  editingRow?.paymentStatus === 'paid' ||
                  editingRow?.isDirectAllotment ||
                  (editingRow?.paymentAmountPaise !== undefined && editingRow.paymentAmountPaise !== null && editingRow.paymentAmountPaise > 0)
                    ? 'bg-muted/60 text-muted-foreground cursor-not-allowed'
                    : ''
                }
              />
              {Boolean(
                editingRow?.status === 'allotted' ||
                editingRow?.paymentStatus === 'success' ||
                editingRow?.paymentStatus === 'paid' ||
                editingRow?.isDirectAllotment ||
                (editingRow?.paymentAmountPaise !== undefined && editingRow.paymentAmountPaise !== null && editingRow.paymentAmountPaise > 0)
              ) ? (
                <p className='text-[11px] text-amber-700 font-medium'>
                  Payment amount is fixed and cannot be modified once assigned or allotted.
                </p>
              ) : (
                <p className='text-[11px] text-muted-foreground'>
                  Leave blank or 0 if stall amount is set by category.
                </p>
              )}
            </div>

            {editingRow?.status !== 'allotted' && (
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
            )}

            {/* Direct Allotment Section for Available Stalls */}
            {editingRow?.status === 'available' && !editingRow?.isDirectAllotment && (
              <div className='rounded-lg border p-3.5 bg-slate-50/80 dark:bg-slate-900/40 space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='space-y-0.5'>
                    <div className='flex items-center gap-2'>
                      <Label htmlFor='edit-direct-allotment-toggle' className='font-semibold text-sm cursor-pointer text-[#0c2847] dark:text-slate-100'>
                        Direct Allotment
                      </Label>
                      {editForm.isDirectAllotment && (
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
                    id='edit-direct-allotment-toggle'
                    checked={editForm.isDirectAllotment}
                    onCheckedChange={checked => setEditForm(prev => ({ ...prev, isDirectAllotment: checked }))}
                  />
                </div>

                {editForm.isDirectAllotment && (
                  <div className='space-y-3 pt-2 border-t'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='edit-allottee-name'>Organisation / Allottee Name <span className='text-destructive'>*</span></Label>
                        <Input
                          id='edit-allottee-name'
                          value={editForm.allotteeName}
                          onChange={e => setEditForm(prev => ({ ...prev, allotteeName: e.target.value }))}
                          placeholder='e.g. Haryana Handlooms / Artisan Name'
                        />
                      </div>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='edit-father-name'>Father&apos;s / Husband&apos;s Name <span className='text-destructive'>*</span></Label>
                        <Input
                          id='edit-father-name'
                          value={editForm.fatherName}
                          onChange={e => setEditForm(prev => ({ ...prev, fatherName: e.target.value }))}
                          placeholder='e.g. Ramesh Kumar'
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='edit-aadhaar-number'>Aadhaar Number (12 digits) <span className='text-destructive'>*</span></Label>
                        <Input
                          id='edit-aadhaar-number'
                          value={editForm.aadhaarNumber}
                          maxLength={12}
                          onChange={e => setEditForm(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '') }))}
                          placeholder='12-digit UID'
                        />
                      </div>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='edit-mobile-number'>Mobile Number <span className='text-destructive'>*</span></Label>
                        <Input
                          id='edit-mobile-number'
                          value={editForm.mobileNumber}
                          maxLength={10}
                          onChange={e => setEditForm(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                          placeholder='10-digit mobile'
                        />
                      </div>
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='edit-email'>Email Address <span className='text-destructive'>*</span></Label>
                        <Input
                          id='edit-email'
                          type='email'
                          value={editForm.email}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder='applicant@example.com'
                        />
                      </div>
                      <div className='grid gap-1.5'>
                        <Label htmlFor='edit-work-purpose'>Purpose of Stall / Activity <span className='text-destructive'>*</span></Label>
                        <Input
                          id='edit-work-purpose'
                          value={editForm.workPurpose}
                          onChange={e => setEditForm(prev => ({ ...prev, workPurpose: e.target.value }))}
                          placeholder='e.g. Handloom exhibition / food stall'
                        />
                      </div>
                    </div>

                    <div className='grid gap-1.5'>
                      <Label htmlFor='edit-address'>Full Postal Address <span className='text-destructive'>*</span></Label>
                      <Textarea
                        id='edit-address'
                        rows={2}
                        value={editForm.address}
                        onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder='House/Shop No., Street, City, State, PIN'
                      />
                    </div>

                    <div className='grid gap-1.5'>
                      <Label htmlFor='edit-notes'>Admin Notes / Remarks (optional)</Label>
                      <Input
                        id='edit-notes'
                        value={editForm.notes}
                        onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder='Any administrative reference or note'
                      />
                    </div>

                    <div className='flex items-center justify-between rounded-md border p-2.5 bg-background'>
                      <div className='space-y-0.5'>
                        <Label htmlFor='edit-send-notif' className='text-xs font-medium cursor-pointer'>
                          Send WhatsApp &amp; Email Notifications
                        </Label>
                        <p className='text-[11px] text-muted-foreground'>
                          Dispatches automated payment link (if fee &gt; 0) or allotment confirmation to the applicant
                        </p>
                      </div>
                      <Switch
                        id='edit-send-notif'
                        checked={editForm.sendNotification}
                        onCheckedChange={checked => setEditForm(prev => ({ ...prev, sendNotification: checked }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Direct Allotment Summary Card if already allotted */}
            {(editingRow?.isDirectAllotment || editingRow?.status === 'allotted') && (
              <div className='rounded-lg border border-purple-200 bg-purple-50/70 p-3.5 space-y-2 text-xs'>
                <div className='flex items-center justify-between'>
                  <span className='font-bold text-purple-950 flex items-center gap-1.5'>
                    <CheckCircle2Icon className='size-4 text-purple-700' />
                    {editingRow.isDirectAllotment ? 'Direct Allotment Active' : 'Allotted by Draw'}
                  </span>
                  <Badge className='bg-purple-100 text-purple-800 border-purple-300 capitalize text-[10px]'>
                    {editingRow.paymentStatus ? `Payment: ${editingRow.paymentStatus}` : 'Allotted'}
                  </Badge>
                </div>
                <div className='grid grid-cols-2 gap-2 text-[11px] text-purple-900 pt-1 border-t border-purple-200/60'>
                  <div>
                    <span className='text-muted-foreground'>Applicant/Ref:</span>{' '}
                    <strong className='font-mono'>{editingRow.applicationNumber || '—'}</strong>
                  </div>
                  <div>
                    <span className='text-muted-foreground'>Payment Amount:</span>{' '}
                    <strong>₹{editingRow.paymentAmountPaise ? (editingRow.paymentAmountPaise / 100).toLocaleString('en-IN') : '0'}</strong>
                  </div>
                </div>
              </div>
            )}
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
        <DialogContent className='sm:max-w-3xl max-h-[92vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-purple-900'>
              <UserPlusIcon className='size-5 text-purple-700' /> Re-allocate Booth/Stall {allottingRow?.stallNumber}
            </DialogTitle>
            <DialogDescription>
              Directly allot this cancelled/vacant stall to an organisation or applicant with official application record and notifications.
            </DialogDescription>
          </DialogHeader>

          {/* Re-allocation Guidelines Banner */}
          <div className='rounded-lg border border-[#0c2847]/15 bg-[#0c2847]/[0.03] p-3 text-xs text-slate-800'>
            <div className='flex items-center gap-2 font-semibold text-[#0c2847] mb-2'>
              <InfoIcon className='size-4 text-[#0c2847] shrink-0' />
              <span>Direct Allotment Guidelines &amp; Rules</span>
            </div>
            <div className='grid gap-2 sm:grid-cols-3 text-[11px] leading-relaxed'>
              <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                <span className='font-bold text-[#0c2847] block mb-0.5'>Direct Assignment</span>
                <span className='text-slate-600'>Reassigns this stall directly to a verified applicant/organisation. The audit trail remains logged in history.</span>
              </div>
              <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                <span className='font-bold text-[#0c2847] block mb-0.5'>Paid Allotment (&gt; ₹0)</span>
                <span className='text-slate-600'>If stall fee &gt; ₹0, a secure payment link is dispatched via WhatsApp &amp; Email to confirm allotment.</span>
              </div>
              <div className='rounded-md border border-slate-200/80 bg-white/90 p-2.5'>
                <span className='font-bold text-[#0c2847] block mb-0.5'>Free / Exempt (₹0)</span>
                <span className='text-slate-600'>If fee is ₹0, the stall is confirmed immediately and the official Allotment Letter is sent directly to the allottee.</span>
              </div>
            </div>
          </div>

          {allottingRow && (
            <div className='flex flex-wrap items-center gap-2 rounded-md border bg-slate-50 p-2.5 text-xs text-slate-800'>
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
                <Label htmlFor='allot-father'>Father&apos;s / Husband&apos;s Name *</Label>
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
                <Label htmlFor='allot-mobile'>Mobile Number (10 digits) *</Label>
                <Input
                  id='allot-mobile'
                  placeholder='10-digit Indian Mobile'
                  maxLength={10}
                  value={allotForm.mobileNumber}
                  onChange={e => setAllotForm(prev => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
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

              <div className='grid gap-1.5'>
                <Label htmlFor='allot-purpose'>Purpose of Stall / Activity *</Label>
                <Input
                  id='allot-purpose'
                  placeholder='e.g. Handloom exhibition and retail sales'
                  value={allotForm.workPurpose}
                  onChange={e => setAllotForm(prev => ({ ...prev, workPurpose: e.target.value }))}
                />
              </div>
            </div>

            <div className='grid gap-1.5'>
              <Label htmlFor='allot-address'>Full Postal Address *</Label>
              <Textarea
                id='allot-address'
                rows={2}
                placeholder='Village / Street, Tehsil, District, State, PIN'
                value={allotForm.address}
                onChange={e => setAllotForm(prev => ({ ...prev, address: e.target.value }))}
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

            <div className='flex items-center justify-between rounded-md border p-2.5 bg-background'>
              <div className='space-y-0.5'>
                <Label htmlFor='allot-send-notif' className='text-xs font-medium cursor-pointer'>
                  Send WhatsApp &amp; Email Notifications
                </Label>
                <p className='text-[11px] text-muted-foreground'>
                  Dispatches automated payment link (if fee &gt; 0) or allotment confirmation to the applicant
                </p>
              </div>
              <Switch
                id='allot-send-notif'
                checked={allotForm.sendNotification}
                onCheckedChange={checked => setAllotForm(prev => ({ ...prev, sendNotification: checked }))}
              />
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

      {/* Stall History Dialog */}
      <Dialog open={historyRow !== null} onOpenChange={open => !open && setHistoryRow(null)}>
        <DialogContent className='sm:max-w-4xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden'>
          <DialogHeader className='px-6 py-4 border-b bg-card shrink-0'>
            <div className='flex items-center justify-between gap-3 pr-6'>
              <div className='flex items-center gap-2.5'>
                <div className='flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 shrink-0'>
                  <HistoryIcon className='size-4 text-slate-700' />
                </div>
                <div>
                  <DialogTitle className='text-base font-bold text-slate-900'>
                    Stall {historyRow?.stallNumber} Activity
                  </DialogTitle>
                  <p className='text-xs text-muted-foreground'>
                    {historyRow?.categoryName} · {historyRow?.shopType === 'double' ? 'Double' : 'Single'} Stall
                  </p>
                </div>
              </div>

              {historyRow && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize border ${
                  historyRow.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : historyRow.status === 'allotted'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {historyRow.status}
                </span>
              )}
            </div>
          </DialogHeader>

          {historyRow && (
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-3 bg-slate-50/70 border-b text-xs shrink-0'>
              <div>
                <span className='block text-[11px] text-muted-foreground'>Stall No.</span>
                <span className='font-bold text-slate-900 font-mono'>{historyRow.stallNumber}</span>
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>Direction</span>
                <span className='font-medium text-slate-800 truncate block'>{historyRow.direction || '—'}</span>
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>Stall Fee</span>
                <span className='font-medium text-slate-800'>
                  {historyRow.paymentAmountPaise
                    ? `₹${(historyRow.paymentAmountPaise / 100).toLocaleString('en-IN')}`
                    : historyRow.emdAmountPaise
                    ? `₹${(historyRow.emdAmountPaise / 100).toLocaleString('en-IN')}`
                    : '₹0'}
                </span>
              </div>
              <div>
                <span className='block text-[11px] text-muted-foreground'>Allottee / App</span>
                <span className='font-medium text-slate-800 truncate block'>
                  {historyRow.applicationNumber || '—'}
                </span>
              </div>
            </div>
          )}

          <div className='flex-1 overflow-y-auto px-6 py-5'>
            {historyLoading ? (
              <div className='flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground'>
                <Loader2Icon className='size-5 animate-spin text-slate-600' />
                <p className='text-xs font-medium text-slate-600'>Loading activity...</p>
              </div>
            ) : historyError ? (
              <Alert variant='destructive' className='my-2'>
                <AlertDescription>{historyError}</AlertDescription>
              </Alert>
            ) : historyEvents.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground gap-1.5'>
                <HistoryIcon className='size-6 text-slate-300' />
                <p className='text-xs font-medium text-slate-600'>No recorded activity yet for this stall.</p>
              </div>
            ) : (
              <div className='relative border-l border-slate-200 ml-3 pl-6 space-y-6 py-1'>
                {historyEvents.map((evt, idx) => {
                  const dotColor = {
                    blue: 'bg-blue-600 ring-blue-100',
                    green: 'bg-emerald-600 ring-emerald-100',
                    amber: 'bg-amber-600 ring-amber-100',
                    red: 'bg-rose-600 ring-rose-100',
                    purple: 'bg-purple-600 ring-purple-100',
                    slate: 'bg-slate-400 ring-slate-100'
                  }[evt.badgeColor] || 'bg-slate-400 ring-slate-100'

                  return (
                    <div key={idx} className='relative group'>
                      <div className={`absolute -left-[27px] top-1.5 size-3 rounded-full ring-4 ${dotColor}`} />
                      <div className='space-y-1.5'>
                        <div className='flex items-baseline justify-between gap-3 flex-wrap'>
                          <h4 className='text-sm font-bold text-slate-900'>{evt.title}</h4>
                          <span className='text-xs text-muted-foreground shrink-0'>
                            {new Date(evt.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                        <p className='text-sm text-slate-600 leading-relaxed'>{evt.description}</p>
                        {evt.actorName && (
                          <p className='text-xs text-muted-foreground'>
                            by <span className='font-medium text-slate-700'>{evt.actorName}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className='px-6 py-3 border-t bg-slate-50/50 shrink-0 flex items-center justify-between sm:justify-between'>
            <span className='text-xs text-muted-foreground'>
              {historyEvents.length > 0 ? `${historyEvents.length} event${historyEvents.length > 1 ? 's' : ''}` : ''}
            </span>
            <Button type='button' variant='outline' size='sm' onClick={() => setHistoryRow(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default InventoryTable
