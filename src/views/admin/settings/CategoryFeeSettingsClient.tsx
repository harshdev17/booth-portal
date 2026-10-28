'use client'

import { Fragment, useState } from 'react'

import {
  AlertCircleIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CoinsIcon,
  CopyIcon,
  FileTextIcon,
  Loader2Icon,
  SaveIcon
} from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type CategoryFeeItem = {
  id: number
  name: string
  name_hi: string | null
  slug: string
  selection_method: string
  fee_paise: number | null
  fee_base_paise: number | null
  gst_percent: number | string | null
  status: string
  application_opens_at: string | null
  application_closes_at: string | null
  auction_date: string | null
  auction_venue: string | null
  auction_venue_hi: string | null
  allotment_amount_paise?: number | null
  allotment_payment_enabled?: number | boolean
  allotment_payment_deadline_at?: string | null
  description: string | null
  description_hi: string | null
  allotment_amount_note: string | null
  allotment_amount_note_hi: string | null
  important_dates_note: string | null
  important_dates_note_hi: string | null
  show_on_homepage: number | boolean
}

/** MySQL DATETIME ("2026-11-10 23:59:00") -> <input type="datetime-local"> value ("2026-11-10T23:59"). */
function toDatetimeLocalValue(value: string | null): string {
  if (!value) return ''

  return value.replace(' ', 'T').slice(0, 16)
}

export default function CategoryFeeSettingsClient({
  categories: initialCategories
}: {
  categories: CategoryFeeItem[]
}) {
  // Only display active / non-archived categories
  const activeOnly = initialCategories.filter(c => c.status !== 'archived')
  const [categories, setCategories] = useState(activeOnly)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [isBulkSavingFee, setIsBulkSavingFee] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedContentId, setExpandedContentId] = useState<number | null>(null)

  const [bulkFee, setBulkFee] = useState({ baseRs: '', gstPercent: '' })

  // Replaces window.confirm() for both the schedule and bulk-fee actions
  // with the project's own Dialog component — a custom confirm dialog
  // matching the rest of the admin panel instead of the browser's native
  // confirm() popup.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description: string
    onConfirm: () => void
  } | null>(null)

  // Find pre-existing schedule from active categories
  const firstWithSchedule =
    activeOnly.find(c => c.application_opens_at || c.application_closes_at || c.auction_date) || activeOnly[0]

  const [portalSchedule, setPortalSchedule] = useState({
    applicationOpensAt: toDatetimeLocalValue(firstWithSchedule?.application_opens_at ?? null),
    applicationClosesAt: toDatetimeLocalValue(firstWithSchedule?.application_closes_at ?? null),
    auctionDate: toDatetimeLocalValue(firstWithSchedule?.auction_date ?? null),
    auctionVenue: firstWithSchedule?.auction_venue ?? '',
    auctionVenueHi: firstWithSchedule?.auction_venue_hi ?? ''
  })

  const activeCategoryIds = categories.map(c => c.id)

  const saveGlobalSchedule = async () => {
    setIsSavingSchedule(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/categories/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: activeCategoryIds, ...portalSchedule })
      })

      const data = await response.json()

      if (response.ok) {
        setCategories(prev =>
          prev.map(c => ({
            ...c,
            application_opens_at: portalSchedule.applicationOpensAt || null,
            application_closes_at: portalSchedule.applicationClosesAt || null,
            auction_date: portalSchedule.auctionDate || null,
            auction_venue: portalSchedule.auctionVenue || null,
            auction_venue_hi: portalSchedule.auctionVenueHi || null
          }))
        )
        setSuccessMessage('Portal schedule updated successfully for all categories!')
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to update portal schedule.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const applyBulkFee = async () => {
    const basePaise = Math.round(Number(bulkFee.baseRs) * 100)
    const gst = bulkFee.gstPercent === '' ? 0 : Number(bulkFee.gstPercent)
    const totalPaise = Math.round(basePaise * (1 + gst / 100))

    setIsBulkSavingFee(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/categories/fee', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: activeCategoryIds, feeBasePaise: basePaise, gstPercent: gst, feePaise: totalPaise })
      })

      const data = await response.json()

      if (response.ok) {
        setCategories(prev =>
          prev.map(c => ({ ...c, fee_base_paise: basePaise, gst_percent: gst, fee_paise: totalPaise }))
        )
        setSuccessMessage(data.message)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to apply fee to all categories.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsBulkSavingFee(false)
    }
  }

  const handleSaveGlobalSchedule = () => {
    if (portalSchedule.applicationOpensAt && new Date(portalSchedule.applicationOpensAt) > new Date()) {
      setConfirmDialog({
        title: 'Confirm Future Opening Date',
        description: `"Application Opens" is set to a future date/time. This will immediately close all ${activeCategoryIds.length} categories to new applicants until then. Continue?`,
        onConfirm: () => {
          setConfirmDialog(null)
          saveGlobalSchedule()
        }
      })

      return
    }

    saveGlobalSchedule()
  }

  const handleBulkApplyFee = () => {
    if (bulkFee.baseRs === '') {
      setErrorMessage('Enter a base fee amount to apply to all categories.')

      return
    }

    const gst = bulkFee.gstPercent === '' ? 0 : Number(bulkFee.gstPercent)

    setConfirmDialog({
      title: 'Confirm Bulk Fee Update',
      description: `Apply ₹${bulkFee.baseRs} base fee + ${gst}% GST to all ${activeCategoryIds.length} categories?`,
      onConfirm: () => {
        setConfirmDialog(null)
        applyBulkFee()
      }
    })
  }

  const handleBaseFeeChange = (categoryId: number, value: string) => {
    const num = value === '' ? null : Math.max(0, Number(value))

    setCategories(prev =>
      prev.map(c => {
        if (c.id !== categoryId) return c
        const basePaise = num !== null ? Math.round(num * 100) : null
        const gst = c.gst_percent !== null ? Number(c.gst_percent) : 0
        const totalPaise = basePaise !== null ? Math.round(basePaise * (1 + gst / 100)) : null

        return { ...c, fee_base_paise: basePaise, fee_paise: totalPaise }
      })
    )
  }

  const handleGstChange = (categoryId: number, value: string) => {
    const gst = value === '' ? null : Math.max(0, Math.min(100, Number(value)))

    setCategories(prev =>
      prev.map(c => {
        if (c.id !== categoryId) return c
        const basePaise = c.fee_base_paise
        const gstNum = gst !== null ? gst : 0
        const totalPaise = basePaise !== null ? Math.round(basePaise * (1 + gstNum / 100)) : null

        return { ...c, gst_percent: gst, fee_paise: totalPaise }
      })
    )
  }

  const handleSaveFee = async (cat: CategoryFeeItem) => {
    setSavingId(cat.id)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/categories/fee', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cat.id,
          feeBasePaise: cat.fee_base_paise,
          gstPercent: cat.gst_percent !== null ? Number(cat.gst_percent) : null,
          feePaise: cat.fee_paise
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Fees for "${cat.name}" updated successfully!`)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to update fee.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveAllotmentPayment = async (cat: CategoryFeeItem) => {
    setSavingId(cat.id)
    setSuccessMessage(null)
    setErrorMessage(null)

    const enabled = Boolean(cat.allotment_payment_enabled)
    const amountPaise =
      cat.allotment_amount_paise !== undefined && cat.allotment_amount_paise !== null
        ? Number(cat.allotment_amount_paise)
        : null
    const deadlineAt = cat.allotment_payment_deadline_at
      ? new Date(cat.allotment_payment_deadline_at).toISOString()
      : null

    if (enabled && (amountPaise === null || amountPaise <= 0 || !deadlineAt)) {
      setErrorMessage('Amount (₹) and payment deadline are required before enabling allotment payment.')
      setSavingId(null)
      return
    }

    try {
      const response = await fetch('/api/admin/categories/allotment-payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cat.id,
          enabled,
          amountPaise,
          deadlineAt
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Allotment payment settings for "${cat.name}" updated successfully!`)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to update allotment payment settings.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleSaveContent = async (cat: CategoryFeeItem) => {
    if (!cat.name.trim() || !cat.name_hi?.trim()) {
      setErrorMessage('Category name (English and Hindi) cannot be empty.')
      return
    }

    setSavingId(cat.id)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/categories/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cat.id,
          name: cat.name.trim(),
          nameHi: cat.name_hi.trim(),
          description: cat.description,
          descriptionHi: cat.description_hi,
          allotmentAmountNote: cat.allotment_amount_note,
          allotmentAmountNoteHi: cat.allotment_amount_note_hi,
          importantDatesNote: cat.important_dates_note,
          importantDatesNoteHi: cat.important_dates_note_hi,
          showOnHomepage: Boolean(cat.show_on_homepage)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(data.message ?? `Content for "${cat.name}" updated successfully!`)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to update category content.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {successMessage && (
        <Alert className='border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl'>
          <CheckCircle2Icon className='size-5 text-emerald-600' />
          <AlertDescription className='font-semibold'>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant='destructive' className='rounded-xl'>
          <AlertCircleIcon className='size-5 text-red-600' />
          <AlertDescription className='font-semibold'>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* 1. Global Unified Portal Schedule */}
      <Card className='shadow-sm border-[#0c2847]/20'>
        <CardHeader className='border-b bg-[#f8fafc] py-4'>
          <CardTitle className='flex items-center gap-2 text-base font-bold text-[#0c2847]'>
            <CalendarClockIcon className='size-5 text-[#0c2847]' />
            Portal Application &amp; Draw Schedule (सभी फॉर्म्स हेतु एकल समय-सारणी)
          </CardTitle>
          <CardDescription className='text-xs'>
            आवेदन शुरू/बंद होने की तिथि एवं लकी ड्रॉ/नीलामी की तारीख और स्थान सभी श्रेणियों के फॉर्म्स के लिए एक ही
            रहते हैं। यहाँ सेट करने पर यह सभी सक्रिय श्रेणियों में स्वतः लागू हो जाएगा।
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-5 pt-6'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Application Opens (आवेदन प्रारंभ)</label>
              <Input
                type='datetime-local'
                value={portalSchedule.applicationOpensAt}
                onChange={e => setPortalSchedule(prev => ({ ...prev, applicationOpensAt: e.target.value }))}
                className='h-9 text-sm'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Application Closes (आवेदन की अंतिम तिथि)</label>
              <Input
                type='datetime-local'
                value={portalSchedule.applicationClosesAt}
                onChange={e => setPortalSchedule(prev => ({ ...prev, applicationClosesAt: e.target.value }))}
                className='h-9 text-sm'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Draw Date &amp; Time (ड्रॉ दिनांक व समय)</label>
              <Input
                type='datetime-local'
                value={portalSchedule.auctionDate}
                onChange={e => setPortalSchedule(prev => ({ ...prev, auctionDate: e.target.value }))}
                className='h-9 text-sm'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Draw Venue - English (ड्रॉ स्थल)</label>
              <Input
                value={portalSchedule.auctionVenue}
                onChange={e => setPortalSchedule(prev => ({ ...prev, auctionVenue: e.target.value }))}
                placeholder='Shri Krishna Museum, Thanesar, Kurukshetra'
                className='h-9 text-sm'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <label className='text-xs font-semibold text-slate-700'>Draw Venue - Hindi (ड्रॉ स्थल हिंदी में)</label>
              <Input
                value={portalSchedule.auctionVenueHi}
                onChange={e => setPortalSchedule(prev => ({ ...prev, auctionVenueHi: e.target.value }))}
                placeholder='श्री कृष्ण संग्रहालय, थानेसर, कुरुक्षेत्र'
                className='h-9 text-sm'
              />
            </div>
            <div className='flex items-end'>
              <Button
                disabled={isSavingSchedule}
                onClick={handleSaveGlobalSchedule}
                className='w-full bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white h-9'
              >
                {isSavingSchedule ? (
                  <Loader2Icon className='size-3.5 animate-spin mr-1.5' />
                ) : (
                  <SaveIcon className='size-3.5 mr-1.5' />
                )}
                Save Schedule for All Forms
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Bulk Quick Fee Apply (Optional) */}
      <Card className='shadow-xs border-[#d8891d]/30'>
        <CardHeader className='border-b bg-[#fffaf0] py-3.5'>
          <CardTitle className='flex items-center gap-2 text-sm font-bold text-[#0c2847]'>
            <CopyIcon className='size-4 text-[#d8891d]' />
            Apply Same Application Fee to All Categories (एकमुश्त शुल्क सेटिंग्स)
          </CardTitle>
          <CardDescription className='text-xs'>
            यदि सभी श्रेणियों में समान आवेदन शुल्क लागू करना हो, तो एक साथ सभी श्रेणियों पर लागू कर सकते हैं।
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-4 pb-4'>
          <div className='grid gap-3 sm:grid-cols-3 max-w-xl'>
            <div className='relative'>
              <span className='absolute left-3 top-2 text-xs font-bold text-muted-foreground'>₹</span>
              <Input
                type='number'
                min={0}
                value={bulkFee.baseRs}
                onChange={e => setBulkFee(prev => ({ ...prev, baseRs: e.target.value }))}
                placeholder='Base fee amount'
                className='pl-7 h-9 text-sm'
              />
            </div>
            <div className='relative'>
              <Input
                type='number'
                min={0}
                max={100}
                value={bulkFee.gstPercent}
                onChange={e => setBulkFee(prev => ({ ...prev, gstPercent: e.target.value }))}
                placeholder='GST % (e.g. 18)'
                className='pr-7 h-9 text-sm'
              />
              <span className='absolute right-3 top-2 text-xs font-bold text-muted-foreground'>%</span>
            </div>
            <Button
              disabled={isBulkSavingFee}
              onClick={handleBulkApplyFee}
              className='bg-[#d8891d] hover:bg-[#b8761b] text-xs font-bold rounded-lg text-white h-9'
            >
              {isBulkSavingFee ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <CopyIcon className='size-3.5 mr-1.5' />}
              Apply Fee to All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Category Fees & Allotment Payment Table */}
      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>
            Active Booth/Stall Categories ({categories.length})
          </CardTitle>
          <CardDescription className='text-xs'>
            प्रत्येक श्रेणी का बेस आवेदन शुल्क, जीएसटी दर एवं आबंटन शुल्क (Allotment Fee) प्रबंधित करें।
          </CardDescription>
        </CardHeader>

        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='border-b bg-muted/20 text-xs font-bold text-muted-foreground uppercase'>
                <tr>
                  <th className='py-3.5 px-4'>Category Name</th>
                  <th className='py-3.5 px-4'>Selection Mode</th>
                  <th className='py-3.5 px-4 w-44'>Base Fee (₹)</th>
                  <th className='py-3.5 px-4 w-36'>GST (%)</th>
                  <th className='py-3.5 px-4'>Total Payable (₹)</th>
                  <th className='py-3.5 px-4 text-right'>Action</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                {categories.map(cat => {
                  const baseRs = cat.fee_base_paise !== null ? cat.fee_base_paise / 100 : ''
                  const gstVal = cat.gst_percent !== null ? cat.gst_percent : ''
                  const totalRs = cat.fee_paise !== null ? (cat.fee_paise / 100).toLocaleString('en-IN') : 'Free / Not Set'
                  const isSaving = savingId === cat.id
                  const isExpanded = expandedId === cat.id
                  const isContentExpanded = expandedContentId === cat.id
                  const hasAllotmentPayment = Boolean(cat.allotment_payment_enabled)

                  return (
                    <Fragment key={cat.id}>
                      <tr className='hover:bg-muted/30 transition'>
                        <td className='py-4 px-4'>
                          <div className='flex items-center gap-2'>
                            <p className='font-bold text-[#0c2847]'>{cat.name}</p>
                            {hasAllotmentPayment && (
                              <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700'>
                                Allotment Fee ₹{cat.allotment_amount_paise ? (cat.allotment_amount_paise / 100).toLocaleString('en-IN') : 0}
                              </span>
                            )}
                          </div>
                          {cat.name_hi && <p className='text-xs text-muted-foreground'>{cat.name_hi}</p>}
                          <span className='font-mono text-[11px] text-muted-foreground'>{cat.slug}</span>
                        </td>
                        <td className='py-4 px-4'>
                          <span className='rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 capitalize'>
                            {cat.selection_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className='py-4 px-4'>
                          <div className='relative'>
                            <span className='absolute left-3 top-2 text-xs font-bold text-muted-foreground'>₹</span>
                            <Input
                              type='number'
                              min={0}
                              value={baseRs}
                              onChange={e => handleBaseFeeChange(cat.id, e.target.value)}
                              placeholder='0'
                              className='pl-7 h-9 text-sm font-semibold'
                            />
                          </div>
                        </td>
                        <td className='py-4 px-4'>
                          <div className='relative'>
                            <Input
                              type='number'
                              min={0}
                              max={100}
                              value={gstVal}
                              onChange={e => handleGstChange(cat.id, e.target.value)}
                              placeholder='18'
                              className='pr-7 h-9 text-sm font-semibold'
                            />
                            <span className='absolute right-3 top-2 text-xs font-bold text-muted-foreground'>%</span>
                          </div>
                        </td>
                        <td className='py-4 px-4'>
                          <span className='font-extrabold text-[#0c2847] text-base'>
                            {cat.fee_paise !== null ? `₹${totalRs}` : '₹0'}
                          </span>
                        </td>
                        <td className='py-4 px-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => setExpandedContentId(isContentExpanded ? null : cat.id)}
                              className='text-xs font-bold rounded-lg border border-slate-300'
                            >
                              <FileTextIcon className='size-3.5 mr-1.5' />
                              Content
                              <ChevronDownIcon
                                className={`size-3.5 ml-1 transition-transform ${isContentExpanded ? 'rotate-180' : ''}`}
                              />
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                              className={`text-xs font-bold rounded-lg border ${
                                hasAllotmentPayment
                                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50'
                                  : 'border-slate-300'
                              }`}
                            >
                              <CoinsIcon className='size-3.5 mr-1.5' />
                              Allotment Fee
                              <ChevronDownIcon
                                className={`size-3.5 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </Button>
                            <Button
                              size='sm'
                              disabled={isSaving}
                              onClick={() => handleSaveFee(cat)}
                              className='bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
                            >
                              {isSaving ? (
                                <Loader2Icon className='size-3.5 animate-spin mr-1.5' />
                              ) : (
                                <SaveIcon className='size-3.5 mr-1.5' />
                              )}
                              Save
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {isContentExpanded && (
                        <tr key={`${cat.id}-content`} className='bg-slate-50/80'>
                          <td colSpan={6} className='px-6 py-4 border-y border-slate-200'>
                            <div className='flex flex-col gap-3'>
                              <div>
                                <h4 className='text-xs font-bold uppercase tracking-wider text-[#0c2847] flex items-center gap-1.5'>
                                  <FileTextIcon className='size-3.5 text-slate-600' />
                                  Content for &ldquo;{cat.name}&rdquo; (श्रेणी सामग्री)
                                </h4>
                                <p className='text-xs text-muted-foreground'>
                                  Name, description, and allotment-amount note shown on the home page and category pages —
                                  changes here go live immediately.
                                </p>
                              </div>

                              <div className='grid gap-4 sm:grid-cols-2'>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>Category Name (English)</label>
                                  <Input
                                    value={cat.name}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c => (c.id === cat.id ? { ...c, name: e.target.value } : c))
                                      )
                                    }
                                    className='h-9 text-sm'
                                  />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>Category Name (Hindi)</label>
                                  <Input
                                    value={cat.name_hi ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c => (c.id === cat.id ? { ...c, name_hi: e.target.value } : c))
                                      )
                                    }
                                    className='h-9 text-sm'
                                  />
                                </div>
                              </div>

                              <div className='grid gap-4 sm:grid-cols-2'>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>Description (English)</label>
                                  <Textarea
                                    value={cat.description ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c => (c.id === cat.id ? { ...c, description: e.target.value } : c))
                                      )
                                    }
                                    rows={3}
                                    className='text-sm'
                                  />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>Description (Hindi)</label>
                                  <Textarea
                                    value={cat.description_hi ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c => (c.id === cat.id ? { ...c, description_hi: e.target.value } : c))
                                      )
                                    }
                                    rows={3}
                                    className='text-sm'
                                  />
                                </div>
                              </div>

                              <div className='grid gap-4 sm:grid-cols-2'>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>
                                    Allotment Amount Note (English)
                                  </label>
                                  <Textarea
                                    value={cat.allotment_amount_note ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id ? { ...c, allotment_amount_note: e.target.value } : c
                                        )
                                      )
                                    }
                                    rows={3}
                                    placeholder='Shown only when there is no single fixed allotment amount, e.g. "Small Booth: Rs. 1,00,000 · Large Booth: Rs. 1,50,000". Use a "• " prefix on a line to show it as a bullet.'
                                    className='text-sm'
                                  />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>
                                    Allotment Amount Note (Hindi)
                                  </label>
                                  <Textarea
                                    value={cat.allotment_amount_note_hi ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id ? { ...c, allotment_amount_note_hi: e.target.value } : c
                                        )
                                      )
                                    }
                                    rows={3}
                                    className='text-sm'
                                  />
                                </div>
                              </div>

                              <div className='grid gap-4 sm:grid-cols-2'>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>
                                    Important Dates &amp; Deadlines (English)
                                  </label>
                                  <Textarea
                                    value={cat.important_dates_note ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id ? { ...c, important_dates_note: e.target.value } : c
                                        )
                                      )
                                    }
                                    rows={5}
                                    placeholder='One line per deadline, prefixed with "• " to show as a bullet, e.g. "• Application Start Date: 29 October 2026, at 10:00 AM". Shown on the Apply form, Category Detail page, and Guidelines page.'
                                    className='text-sm'
                                  />
                                </div>
                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>
                                    Important Dates &amp; Deadlines (Hindi)
                                  </label>
                                  <Textarea
                                    value={cat.important_dates_note_hi ?? ''}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id ? { ...c, important_dates_note_hi: e.target.value } : c
                                        )
                                      )
                                    }
                                    rows={5}
                                    className='text-sm'
                                  />
                                </div>
                              </div>

                              <div className='flex items-center justify-between gap-3'>
                                <div className='flex items-center gap-2'>
                                  <input
                                    type='checkbox'
                                    id={`show-on-homepage-${cat.id}`}
                                    checked={Boolean(cat.show_on_homepage)}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id ? { ...c, show_on_homepage: e.target.checked ? 1 : 0 } : c
                                        )
                                      )
                                    }
                                    className='size-4 rounded border-slate-300 text-[#0c2847] focus:ring-[#0c2847]'
                                  />
                                  <label
                                    htmlFor={`show-on-homepage-${cat.id}`}
                                    className='text-xs font-bold text-slate-800 cursor-pointer'
                                  >
                                    Show as a card on the home page
                                  </label>
                                </div>

                                <Button
                                  size='sm'
                                  disabled={isSaving}
                                  onClick={() => handleSaveContent(cat)}
                                  className='bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
                                >
                                  {isSaving ? (
                                    <Loader2Icon className='size-3.5 animate-spin mr-1.5' />
                                  ) : (
                                    <SaveIcon className='size-3.5 mr-1.5' />
                                  )}
                                  Save Content
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExpanded && (
                        <tr key={`${cat.id}-allotment`} className='bg-slate-50/80'>
                          <td colSpan={6} className='px-6 py-4 border-y border-slate-200'>
                            <div className='flex flex-col gap-3'>
                              <div>
                                <h4 className='text-xs font-bold uppercase tracking-wider text-[#0c2847] flex items-center gap-1.5'>
                                  <CoinsIcon className='size-3.5 text-amber-600' />
                                  Allotment Payment Settings for &ldquo;{cat.name}&rdquo; (आबंटन शुल्क सेटिंग्स)
                                </h4>
                                <p className='text-xs text-muted-foreground'>
                                  Require draw-selected applicants to pay an allotment fee before the deadline to confirm their booth/stall.
                                </p>
                              </div>

                              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end'>
                                <div className='flex items-center gap-2 h-9'>
                                  <input
                                    type='checkbox'
                                    id={`allotment-enabled-${cat.id}`}
                                    checked={Boolean(cat.allotment_payment_enabled)}
                                    onChange={e =>
                                      setCategories(prev =>
                                        prev.map(c =>
                                          c.id === cat.id ? { ...c, allotment_payment_enabled: e.target.checked ? 1 : 0 } : c
                                        )
                                      )
                                    }
                                    className='size-4 rounded border-slate-300 text-[#0c2847] focus:ring-[#0c2847]'
                                  />
                                  <label
                                    htmlFor={`allotment-enabled-${cat.id}`}
                                    className='text-xs font-bold text-slate-800 cursor-pointer'
                                  >
                                    Enable Allotment Payment
                                  </label>
                                </div>

                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>Allotment Amount (₹)</label>
                                  <div className='relative'>
                                    <span className='absolute left-3 top-2 text-xs font-bold text-muted-foreground'>₹</span>
                                    <Input
                                      type='number'
                                      min={0}
                                      value={
                                        cat.allotment_amount_paise !== null && cat.allotment_amount_paise !== undefined
                                          ? cat.allotment_amount_paise / 100
                                          : ''
                                      }
                                      onChange={e => {
                                        const val = e.target.value === '' ? null : Math.round(Number(e.target.value) * 100)
                                        setCategories(prev =>
                                          prev.map(c => (c.id === cat.id ? { ...c, allotment_amount_paise: val } : c))
                                        )
                                      }}
                                      placeholder='e.g. 30000'
                                      className='pl-7 h-9 text-sm'
                                    />
                                  </div>
                                </div>

                                <div className='flex flex-col gap-1.5'>
                                  <label className='text-xs font-semibold text-slate-700'>Payment Deadline</label>
                                  <Input
                                    type='datetime-local'
                                    value={toDatetimeLocalValue(cat.allotment_payment_deadline_at ?? null)}
                                    onChange={e => {
                                      const val = e.target.value ? e.target.value.replace('T', ' ') + ':00' : null
                                      setCategories(prev =>
                                        prev.map(c => (c.id === cat.id ? { ...c, allotment_payment_deadline_at: val } : c))
                                      )
                                    }}
                                    className='h-9 text-sm'
                                  />
                                </div>

                                <div className='flex items-end'>
                                  <Button
                                    size='sm'
                                    disabled={isSaving}
                                    onClick={() => handleSaveAllotmentPayment(cat)}
                                    className='w-full bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white h-9'
                                  >
                                    {isSaving ? (
                                      <Loader2Icon className='size-3.5 animate-spin mr-1.5' />
                                    ) : (
                                      <SaveIcon className='size-3.5 mr-1.5' />
                                    )}
                                    Save Allotment Settings
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDialog !== null} onOpenChange={open => !open && setConfirmDialog(null)}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            <DialogDescription>{confirmDialog?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setConfirmDialog(null)}>
              Cancel
            </Button>
            <Button type='button' onClick={() => confirmDialog?.onConfirm()} className='bg-[#0c2847] hover:bg-[#071f3a] text-white'>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
