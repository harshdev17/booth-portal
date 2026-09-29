'use client'

import { Fragment, useState } from 'react'

import { AlertCircleIcon, CalendarClockIcon, CheckCircle2Icon, ChevronDownIcon, CopyIcon, Loader2Icon, SaveIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
  const [categories, setCategories] = useState(initialCategories)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [bulkFee, setBulkFee] = useState({ baseRs: '', gstPercent: '' })
  const [bulkSchedule, setBulkSchedule] = useState({
    applicationOpensAt: '',
    applicationClosesAt: '',
    auctionDate: '',
    auctionVenue: '',
    auctionVenueHi: ''
  })

  const activeCategoryIds = categories.filter(c => c.status !== 'archived').map(c => c.id)

  const handleBulkApplyFee = async () => {
    if (bulkFee.baseRs === '') {
      setErrorMessage('Enter a base fee amount to apply to all categories.')

      return
    }

    const basePaise = Math.round(Number(bulkFee.baseRs) * 100)
    const gst = bulkFee.gstPercent === '' ? 0 : Number(bulkFee.gstPercent)
    const totalPaise = Math.round(basePaise * (1 + gst / 100))

    if (!window.confirm(`Apply ₹${bulkFee.baseRs} base fee + ${gst}% GST to all ${activeCategoryIds.length} active categories?`)) return

    setIsBulkSaving(true)
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
          prev.map(c => (activeCategoryIds.includes(c.id) ? { ...c, fee_base_paise: basePaise, gst_percent: gst, fee_paise: totalPaise } : c))
        )
        setSuccessMessage(data.message)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to apply fee to all categories.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsBulkSaving(false)
    }
  }

  const handleBulkApplySchedule = async () => {
    if (
      bulkSchedule.applicationOpensAt &&
      new Date(bulkSchedule.applicationOpensAt) > new Date() &&
      !window.confirm(
        `"Application Opens" is set to a future date/time. This will immediately close all ${activeCategoryIds.length} active categories to new applicants until then. Continue?`
      )
    ) {
      return
    }

    if (!window.confirm(`Apply this schedule to all ${activeCategoryIds.length} active categories?`)) return

    setIsBulkSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/categories/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: activeCategoryIds, ...bulkSchedule })
      })

      const data = await response.json()

      if (response.ok) {
        setCategories(prev =>
          prev.map(c =>
            activeCategoryIds.includes(c.id)
              ? {
                  ...c,
                  application_opens_at: bulkSchedule.applicationOpensAt || null,
                  application_closes_at: bulkSchedule.applicationClosesAt || null,
                  auction_date: bulkSchedule.auctionDate || null,
                  auction_venue: bulkSchedule.auctionVenue || null,
                  auction_venue_hi: bulkSchedule.auctionVenueHi || null
                }
              : c
          )
        )
        setSuccessMessage(data.message)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to apply schedule to all categories.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsBulkSaving(false)
    }
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

  const handleSave = async (cat: CategoryFeeItem) => {
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

  const handleScheduleFieldChange = (categoryId: number, field: keyof CategoryFeeItem, value: string) => {
    setCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, [field]: value || null } : c)))
  }

  const handleSaveSchedule = async (cat: CategoryFeeItem) => {
    // Setting "Application Opens" to a future date immediately closes this
    // category to new applicants until that date, even if the category's
    // status is "open" — confirm explicitly, since this silently blocks
    // real applicants with no other warning in this UI.
    if (cat.application_opens_at && new Date(cat.application_opens_at) > new Date()) {
      const confirmed = window.confirm(
        `"Application Opens" is set to a future date/time. This will immediately close "${cat.name}" to new applicants until then. Continue?`
      )

      if (!confirmed) return
    }

    setSavingId(cat.id)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/categories/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: cat.id,
          applicationOpensAt: cat.application_opens_at,
          applicationClosesAt: cat.application_closes_at,
          auctionDate: cat.auction_date,
          auctionVenue: cat.auction_venue,
          auctionVenueHi: cat.auction_venue_hi
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`Schedule for "${cat.name}" updated successfully!`)
        setTimeout(() => setSuccessMessage(null), 4000)
      } else {
        setErrorMessage(data.error ?? 'Failed to update schedule.')
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

      <Card className='shadow-xs border-[#d8891d]/30'>
        <CardHeader className='border-b bg-[#fffaf0] py-4'>
          <CardTitle className='flex items-center gap-2 text-base font-bold text-[#0c2847]'>
            <CopyIcon className='size-4 text-[#d8891d]' />
            Apply Same Fee/Schedule to All Categories
          </CardTitle>
          <CardDescription className='text-xs'>
            If every category shares the same fee and/or dates, set it once here instead of repeating it per category
            below. This overwrites the current fee/schedule on all {activeCategoryIds.length} active (non-archived)
            categories — per-category values can still be adjusted individually afterward.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-5 pt-6'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground'>Fee &amp; GST</p>
            <div className='grid gap-3 sm:grid-cols-3'>
              <div className='relative'>
                <span className='absolute left-3 top-2 text-xs font-bold text-muted-foreground'>₹</span>
                <Input
                  type='number'
                  min={0}
                  value={bulkFee.baseRs}
                  onChange={e => setBulkFee(prev => ({ ...prev, baseRs: e.target.value }))}
                  placeholder='Base fee for all categories'
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
                disabled={isBulkSaving}
                onClick={handleBulkApplyFee}
                className='bg-[#d8891d] hover:bg-[#b8761b] text-xs font-bold rounded-lg text-white'
              >
                {isBulkSaving ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <CopyIcon className='size-3.5 mr-1.5' />}
                Apply Fee to All
              </Button>
            </div>
          </div>

          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground'>Schedule &amp; Auction</p>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Application Opens</label>
                <Input
                  type='datetime-local'
                  value={bulkSchedule.applicationOpensAt}
                  onChange={e => setBulkSchedule(prev => ({ ...prev, applicationOpensAt: e.target.value }))}
                  className='h-9 text-sm'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Application Closes</label>
                <Input
                  type='datetime-local'
                  value={bulkSchedule.applicationClosesAt}
                  onChange={e => setBulkSchedule(prev => ({ ...prev, applicationClosesAt: e.target.value }))}
                  className='h-9 text-sm'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Auction Date &amp; Time</label>
                <Input
                  type='datetime-local'
                  value={bulkSchedule.auctionDate}
                  onChange={e => setBulkSchedule(prev => ({ ...prev, auctionDate: e.target.value }))}
                  className='h-9 text-sm'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Auction Venue (English)</label>
                <Input
                  value={bulkSchedule.auctionVenue}
                  onChange={e => setBulkSchedule(prev => ({ ...prev, auctionVenue: e.target.value }))}
                  placeholder='Shri Krishna Museum, Thanesar, Kurukshetra'
                  className='h-9 text-sm'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-semibold text-slate-700'>Auction Venue (Hindi)</label>
                <Input
                  value={bulkSchedule.auctionVenueHi}
                  onChange={e => setBulkSchedule(prev => ({ ...prev, auctionVenueHi: e.target.value }))}
                  placeholder='श्री कृष्ण संग्रहालय, थानेसर, कुरुक्षेत्र'
                  className='h-9 text-sm'
                />
              </div>
              <div className='flex items-end'>
                <Button
                  disabled={isBulkSaving}
                  onClick={handleBulkApplySchedule}
                  className='w-full bg-[#d8891d] hover:bg-[#b8761b] text-xs font-bold rounded-lg text-white'
                >
                  {isBulkSaving ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <CopyIcon className='size-3.5 mr-1.5' />}
                  Apply Schedule to All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Stall Category Fees & GST Rates</CardTitle>
          <CardDescription className='text-xs'>
            Set the base application fee in Rupees (₹) and the applicable GST percentage for each stall category.
            The total payable amount is automatically calculated and shown to applicants on the portal.
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
                  const isArchived = cat.status === 'archived'

                  return (
                    <Fragment key={cat.id}>
                      <tr className={`transition ${isArchived ? 'bg-slate-50/60 opacity-70' : 'hover:bg-muted/30'}`}>
                        <td className='py-4 px-4'>
                          <div className='flex items-center gap-2'>
                            <p className='font-bold text-[#0c2847]'>{cat.name}</p>
                            {isArchived && (
                              <span className='rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase'>
                                Archived
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
                              onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                              className='text-xs font-bold rounded-lg'
                            >
                              <CalendarClockIcon className='size-3.5 mr-1.5' />
                              Schedule
                              <ChevronDownIcon className={`size-3.5 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                            <Button
                              size='sm'
                              disabled={isSaving}
                              onClick={() => handleSave(cat)}
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

                      {isExpanded && (
                        <tr key={`${cat.id}-schedule`} className='bg-muted/20'>
                          <td colSpan={6} className='px-4 py-5'>
                            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                              <div className='flex flex-col gap-1.5'>
                                <label className='text-xs font-semibold text-slate-700'>Application Opens</label>
                                <Input
                                  type='datetime-local'
                                  value={toDatetimeLocalValue(cat.application_opens_at)}
                                  onChange={e => handleScheduleFieldChange(cat.id, 'application_opens_at', e.target.value)}
                                  className='h-9 text-sm'
                                />
                              </div>
                              <div className='flex flex-col gap-1.5'>
                                <label className='text-xs font-semibold text-slate-700'>Application Closes (Last Date)</label>
                                <Input
                                  type='datetime-local'
                                  value={toDatetimeLocalValue(cat.application_closes_at)}
                                  onChange={e => handleScheduleFieldChange(cat.id, 'application_closes_at', e.target.value)}
                                  className='h-9 text-sm'
                                />
                              </div>
                              <div className='flex flex-col gap-1.5'>
                                <label className='text-xs font-semibold text-slate-700'>Auction Date &amp; Time</label>
                                <Input
                                  type='datetime-local'
                                  value={toDatetimeLocalValue(cat.auction_date)}
                                  onChange={e => handleScheduleFieldChange(cat.id, 'auction_date', e.target.value)}
                                  className='h-9 text-sm'
                                />
                              </div>
                              <div className='flex flex-col gap-1.5'>
                                <label className='text-xs font-semibold text-slate-700'>Auction Venue (English)</label>
                                <Input
                                  value={cat.auction_venue ?? ''}
                                  onChange={e => handleScheduleFieldChange(cat.id, 'auction_venue', e.target.value)}
                                  placeholder='Shri Krishna Museum, Thanesar, Kurukshetra'
                                  className='h-9 text-sm'
                                />
                              </div>
                              <div className='flex flex-col gap-1.5'>
                                <label className='text-xs font-semibold text-slate-700'>Auction Venue (Hindi)</label>
                                <Input
                                  value={cat.auction_venue_hi ?? ''}
                                  onChange={e => handleScheduleFieldChange(cat.id, 'auction_venue_hi', e.target.value)}
                                  placeholder='श्री कृष्ण संग्रहालय, थानेसर, कुरुक्षेत्र'
                                  className='h-9 text-sm'
                                />
                              </div>
                              <div className='flex items-end'>
                                <Button
                                  size='sm'
                                  disabled={isSaving}
                                  onClick={() => handleSaveSchedule(cat)}
                                  className='bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
                                >
                                  {isSaving ? (
                                    <Loader2Icon className='size-3.5 animate-spin mr-1.5' />
                                  ) : (
                                    <SaveIcon className='size-3.5 mr-1.5' />
                                  )}
                                  Save Schedule
                                </Button>
                              </div>
                            </div>
                            <p className='mt-3 text-xs text-muted-foreground'>
                              Leave a field blank to hide that instruction point on the public application form. Only
                              categories with an auction date and venue both set will show the auction instruction.
                            </p>
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
    </div>
  )
}
