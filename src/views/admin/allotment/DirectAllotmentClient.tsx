'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import {
  BanIcon,
  BellRingIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  PlusIcon,
  PrinterIcon,
  RefreshCwIcon,
  StoreIcon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Category = { id: number; name: string }
type Stall = { id: number; categoryId: number; stallNumber: string; shopType: string; direction: string | null }
type Existing = {
  id: number
  applicationId: number | null
  categoryName: string
  stallNumber: string
  allotteeName: string
  contactPerson: string | null
  mobileNumber: string | null
  allottedAt: string
  applicationNumber: string | null
  paymentAmountPaise: number
  paymentStatus: string
}

export default function DirectAllotmentClient({
  initialCategories,
  stalls,
  existing
}: {
  initialCategories: Category[]
  stalls: Stall[]
  existing: Existing[]
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [categoryId, setCategoryId] = useState<number>(initialCategories[0]?.id ?? 0)
  const [categoryName, setCategoryName] = useState('')

  const [form, setForm] = useState({
    shopUnitId: '',
    allotteeName: '',
    contactPerson: '',
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

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const availableStalls = useMemo(() => stalls.filter(stall => stall.categoryId === categoryId), [stalls, categoryId])

  const createCategory = async () => {
    setError(null)
    setMessage(null)
    const response = await fetch('/api/admin/direct-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName })
    })
    const data = await response.json()
    if (!response.ok) return setError(data.error ?? 'Could not create category.')
    setCategories(current => [...current, { id: data.id, name: data.name }])
    setCategoryId(data.id)
    setCategoryName('')
    setMessage('Category created. Now add its stalls from Inventory, then return here to allot them.')
  }

  const allot = async () => {
    setError(null)
    setMessage(null)

    // Validation
    if (!categoryId) return setError('Please select a category.')
    if (!form.shopUnitId) return setError('Please select an available stall.')
    if (!form.allotteeName.trim()) return setError('Organisation / Allottee name is mandatory.')
    if (!form.fatherName.trim()) return setError("Father's name is mandatory.")
    if (!/^\d{12}$/.test(form.aadhaarNumber.trim().replace(/\s+/g, ''))) {
      return setError('Aadhaar number must be exactly 12 digits.')
    }
    if (!form.address.trim()) return setError('Full address is mandatory.')
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim().replace(/\D/g, '').slice(-10))) {
      return setError('A valid 10-digit mobile number is mandatory.')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError('A valid email address is mandatory.')
    }
    if (!form.workPurpose.trim()) return setError('Purpose of stall / activity is mandatory.')

    setSaving(true)
    try {
      const response = await fetch('/api/admin/direct-allotments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          shopUnitId: Number(form.shopUnitId),
          allotteeName: form.allotteeName,
          contactPerson: form.contactPerson || form.allotteeName,
          fatherName: form.fatherName,
          aadhaarNumber: form.aadhaarNumber,
          address: form.address,
          mobileNumber: form.mobileNumber,
          email: form.email,
          workPurpose: form.workPurpose,
          paymentAmountRupees: form.paymentAmountRupees,
          notes: form.notes,
          sendNotification: form.sendNotification
        })
      })
      const data = await response.json()
      if (!response.ok) return setError(data.error ?? 'Could not allot stall.')

      const paymentPaise = Math.round(Number(form.paymentAmountRupees || 0) * 100)
      const successInfo =
        paymentPaise > 0
          ? `Stall ${data.stallNumber} reserved successfully (App No: ${data.applicationNumber}). Payment link sent via WhatsApp & Email.`
          : `Stall ${data.stallNumber} allotted successfully (App No: ${data.applicationNumber}). Allotment letter link sent via WhatsApp & Email.`

      setMessage(successInfo)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } finally {
      setSaving(false)
    }
  }

  const [interchangeFirstId, setInterchangeFirstId] = useState<string>('')
  const [interchangeSecondId, setInterchangeSecondId] = useState<string>('')
  const [interchangeReason, setInterchangeReason] = useState('')
  const [interchangeSaving, setInterchangeSaving] = useState(false)
  const [interchangeError, setInterchangeError] = useState<string | null>(null)
  const [interchangeMessage, setInterchangeMessage] = useState<string | null>(null)

  const interchange = async () => {
    setInterchangeError(null)
    setInterchangeMessage(null)
    setInterchangeSaving(true)
    try {
      const response = await fetch('/api/admin/direct-allotments/interchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstAllotmentId: Number(interchangeFirstId),
          secondAllotmentId: Number(interchangeSecondId),
          reason: interchangeReason
        })
      })
      const data = await response.json()
      if (!response.ok) return setInterchangeError(data.error ?? 'Could not interchange stalls.')
      setInterchangeMessage('Stalls successfully interchanged! Refreshing...')
      setTimeout(() => window.location.reload(), 1200)
    } finally {
      setInterchangeSaving(false)
    }
  }

  const [copiedAppNo, setCopiedAppNo] = useState<string | null>(null)
  const [activeActionId, setActiveActionId] = useState<{ id: number; action: 'reminder' | 'regenerate' | 'print' | 'cancel' } | null>(null)
  const [listMessage, setListMessage] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const cancelDirectAllotment = async (item: Existing) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the allotment for Stall ${item.stallNumber} (${item.allotteeName})?\n\nThe stall will become available for re-allocation immediately.`
    )
    if (!confirmed) return

    setListError(null)
    setListMessage(null)
    setActiveActionId({ id: item.id, action: 'cancel' })

    try {
      const res = await fetch(`/api/admin/direct-allotments/${item.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin cancelled from direct allotments list' })
      })

      const data = await res.json()
      if (!res.ok) {
        setListError(data.error ?? 'Failed to cancel allotment.')
        return
      }

      setListMessage(`Allotment for Stall ${item.stallNumber} cancelled successfully! Stall is now available.`)
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      setListError('Failed to communicate with server.')
    } finally {
      setActiveActionId(null)
    }
  }

  const copyPaymentLink = async (appNo: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/status?appNo=${encodeURIComponent(appNo)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedAppNo(appNo)
      setTimeout(() => setCopiedAppNo(null), 2500)
    } catch {
      setListError('Could not copy link to clipboard.')
    }
  }

  const printAllotmentLetter = async (targetId: number) => {
    setListError(null)
    setActiveActionId({ id: targetId, action: 'print' })
    try {
      const response = await fetch(`/api/admin/applications/${targetId}/allotment-letter/pdf?format=html`)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setListError(body.error ?? 'Could not load allotment letter for printing.')
        return
      }

      const html = await response.text()
      const frame = document.createElement('iframe')
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      frame.srcdoc = html
      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => frame.remove(), 60_000)
      }
      document.body.appendChild(frame)
    } catch {
      setListError('Unable to contact server for printing.')
    } finally {
      setActiveActionId(null)
    }
  }

  const sendDirectReminder = async (targetId: number, appNo: string) => {
    setListError(null)
    setListMessage(null)
    setActiveActionId({ id: targetId, action: 'reminder' })
    try {
      const res = await fetch(`/api/admin/applications/${targetId}/send-payment-reminder`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) {
        setListError(data.error ?? 'Failed to send reminder.')
        return
      }
      setListMessage(data.message ?? `Reminder sent successfully for ${appNo}.`)
      setTimeout(() => setListMessage(null), 4000)
    } catch {
      setListError('Failed to contact server for reminder.')
    } finally {
      setActiveActionId(null)
    }
  }

  const regenerateDirectOrder = async (targetId: number, appNo: string) => {
    setListError(null)
    setListMessage(null)
    setActiveActionId({ id: targetId, action: 'regenerate' })
    try {
      const res = await fetch(`/api/admin/applications/${targetId}/regenerate-payment-link`, {
        method: 'POST'
      })
      const data = await res.json()
      if (!res.ok) {
        setListError(data.error ?? 'Failed to regenerate payment order.')
        return
      }
      setListMessage(data.message ?? `New Razorpay order generated for ${appNo}.`)
      setTimeout(() => setListMessage(null), 4000)
    } catch {
      setListError('Failed to regenerate payment order.')
    } finally {
      setActiveActionId(null)
    }
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]'>
      <div className='space-y-6'>
        {/* Category Creation */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Create Direct Category</CardTitle>
            <CardDescription>Public application form will stay closed for this category.</CardDescription>
          </CardHeader>
          <CardContent className='flex gap-2'>
            <Input
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              placeholder='e.g. Government Pavilion'
            />
            <Button type='button' onClick={createCategory}>
              <PlusIcon className='size-4' /> Create
            </Button>
          </CardContent>
        </Card>

        {/* Direct Stall Allotment Form */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Direct Booth/Stall Allotment</CardTitle>
            <CardDescription>
              Enter mandatory allottee details, father&apos;s name, Aadhaar, address, contact, purpose, and stall fee.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Category & Stall Selection */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label>Category *</Label>
                <select
                  value={categoryId}
                  onChange={e => {
                    setCategoryId(Number(e.target.value))
                    setForm(current => ({ ...current, shopUnitId: '' }))
                  }}
                  className='h-10 rounded-md border border-input bg-background px-3 text-sm'
                >
                  <option value={0}>Select category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='grid gap-1.5'>
                <Label>Available Booth/Stall *</Label>
                <select
                  value={form.shopUnitId}
                  onChange={e => setForm(current => ({ ...current, shopUnitId: e.target.value }))}
                  className='h-10 rounded-md border border-input bg-background px-3 text-sm'
                  disabled={!categoryId}
                >
                  <option value=''>Select available stall</option>
                  {availableStalls.map(stall => (
                    <option key={stall.id} value={stall.id}>
                      {stall.stallNumber} · {stall.shopType}
                      {stall.direction ? ` · ${stall.direction}` : ''}
                    </option>
                  ))}
                </select>
                {categoryId && availableStalls.length === 0 && (
                  <p className='text-xs text-muted-foreground'>
                    No available stalls. Add stalls under this category in Inventory first.
                  </p>
                )}
              </div>
            </div>

            {/* Allottee & Father Name */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label>Organisation / Allottee Name *</Label>
                <Input
                  value={form.allotteeName}
                  onChange={e => setForm(current => ({ ...current, allotteeName: e.target.value }))}
                  placeholder='Firm / Organisation / Allottee Name'
                />
              </div>

              <div className='grid gap-1.5'>
                <Label>Father&apos;s / Husband&apos;s Name *</Label>
                <Input
                  value={form.fatherName}
                  onChange={e => setForm(current => ({ ...current, fatherName: e.target.value }))}
                  placeholder="Father's Name"
                />
              </div>
            </div>

            {/* Representative Name & Aadhaar Number */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label>Representative / Contact Person</Label>
                <Input
                  value={form.contactPerson}
                  onChange={e => setForm(current => ({ ...current, contactPerson: e.target.value }))}
                  placeholder='Leave blank to use Allottee Name'
                />
              </div>

              <div className='grid gap-1.5'>
                <Label>Aadhaar Card Number (12 digits) *</Label>
                <Input
                  maxLength={12}
                  value={form.aadhaarNumber}
                  onChange={e =>
                    setForm(current => ({
                      ...current,
                      aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12)
                    }))
                  }
                  placeholder='12-digit Aadhaar Number'
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label>Mobile Number (10 digits) *</Label>
                <Input
                  maxLength={10}
                  value={form.mobileNumber}
                  onChange={e =>
                    setForm(current => ({
                      ...current,
                      mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10)
                    }))
                  }
                  placeholder='10-digit Mobile Number'
                />
              </div>

              <div className='grid gap-1.5'>
                <Label>Email Address *</Label>
                <Input
                  type='email'
                  value={form.email}
                  onChange={e => setForm(current => ({ ...current, email: e.target.value }))}
                  placeholder='applicant@example.com'
                />
              </div>
            </div>

            {/* Address */}
            <div className='grid gap-1.5'>
              <Label>Complete Postal Address *</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={e => setForm(current => ({ ...current, address: e.target.value }))}
                placeholder='Full Postal Address, City, State, PIN'
              />
            </div>

            {/* Work Purpose & Payment Amount */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label>Purpose of Stall / Activity *</Label>
                <Input
                  value={form.workPurpose}
                  onChange={e => setForm(current => ({ ...current, workPurpose: e.target.value }))}
                  placeholder='e.g. Handicrafts Exhibition, Food Stall, Info Desk'
                />
              </div>

              <div className='grid gap-1.5'>
                <Label>Stall Amount in ₹ (0 for Free Allotment) *</Label>
                <Input
                  type='number'
                  min='0'
                  value={form.paymentAmountRupees}
                  onChange={e => setForm(current => ({ ...current, paymentAmountRupees: e.target.value }))}
                  placeholder='0'
                />
                <p className='text-[11px] text-muted-foreground'>
                  If 0, stall is allotted immediately. If &gt; 0, a payment link is generated and required to confirm.
                </p>
              </div>
            </div>

            {/* Note */}
            <div className='grid gap-1.5'>
              <Label>Internal Note (optional)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(current => ({ ...current, notes: e.target.value }))}
                placeholder='Reference memo, recommendation, or remarks'
              />
            </div>

            {error && <p className='text-sm font-medium text-destructive'>{error}</p>}
            {message && <p className='text-sm font-medium text-emerald-700'>{message}</p>}

            <Button
              type='button'
              onClick={allot}
              disabled={
                saving ||
                !categoryId ||
                !form.shopUnitId ||
                !form.allotteeName.trim() ||
                !form.fatherName.trim() ||
                !form.aadhaarNumber.trim() ||
                !form.address.trim() ||
                !form.mobileNumber.trim() ||
                !form.email.trim() ||
                !form.workPurpose.trim()
              }
              className='w-full sm:w-auto'
            >
              {saving ? 'Processing Allotment…' : 'Allot Stall'}
            </Button>
          </CardContent>
        </Card>

        {/* Interchange Section */}
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Interchange Two Allotted Stalls</CardTitle>
            <CardDescription>Swap stall assignments between two active direct allottees with audit history.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {existing.length < 2 ? (
              <p className='text-xs text-muted-foreground'>
                At least two active direct allotments are needed to perform an interchange.
              </p>
            ) : (
              <>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='grid gap-1.5'>
                    <Label>First Allotment</Label>
                    <select
                      value={interchangeFirstId}
                      onChange={e => setInterchangeFirstId(e.target.value)}
                      className='h-10 rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value=''>Select allotment</option>
                      {existing.map(item => (
                        <option key={item.id} value={item.id} disabled={String(item.id) === interchangeSecondId}>
                          {item.stallNumber} · {item.allotteeName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='grid gap-1.5'>
                    <Label>Second Allotment</Label>
                    <select
                      value={interchangeSecondId}
                      onChange={e => setInterchangeSecondId(e.target.value)}
                      className='h-10 rounded-md border border-input bg-background px-3 text-sm'
                    >
                      <option value=''>Select allotment</option>
                      {existing.map(item => (
                        <option key={item.id} value={item.id} disabled={String(item.id) === interchangeFirstId}>
                          {item.stallNumber} · {item.allotteeName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className='grid gap-1.5'>
                  <Label>Reason for interchange</Label>
                  <Textarea
                    value={interchangeReason}
                    onChange={e => setInterchangeReason(e.target.value)}
                    placeholder='Official justification / memo reference for swapping stalls'
                  />
                </div>
                {interchangeError && <p className='text-sm text-destructive'>{interchangeError}</p>}
                {interchangeMessage && <p className='text-sm text-emerald-700'>{interchangeMessage}</p>}
                <Button
                  type='button'
                  variant='outline'
                  onClick={interchange}
                  disabled={
                    interchangeSaving ||
                    !interchangeFirstId ||
                    !interchangeSecondId ||
                    interchangeFirstId === interchangeSecondId ||
                    !interchangeReason.trim()
                  }
                >
                  {interchangeSaving ? 'Interchanging…' : 'Interchange Stalls'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Existing Direct Allotments List */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <StoreIcon className='size-4' /> Direct Allotments ({existing.length})
          </CardTitle>
          <CardDescription>Current direct/admin-created allotments.</CardDescription>
        </CardHeader>
        <CardContent>
          {existing.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>No direct allotments yet.</p>
          ) : (
            <div className='space-y-3'>
              {existing.map(item => {
                const amount = item.paymentAmountPaise > 0 ? `₹${(item.paymentAmountPaise / 100).toLocaleString('en-IN')}` : 'Free (₹0)'
                return (
                  <div key={item.id} className='rounded-lg border bg-white p-3 shadow-2xs'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='font-semibold text-[#0c2847]'>{item.allotteeName}</p>
                        {item.applicationNumber && (
                          <p className='font-mono text-xs text-slate-500 font-medium'>App: {item.applicationNumber}</p>
                        )}
                      </div>
                      <div className='text-right'>
                        <span className='inline-block rounded-md bg-blue-50 px-2 py-0.5 font-mono text-sm font-bold text-blue-700 border border-blue-200'>
                          {item.stallNumber}
                        </span>
                      </div>
                    </div>

                    <div className='mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                      <span>{item.categoryName}</span>
                      {item.contactPerson && <span>· {item.contactPerson}</span>}
                      {item.mobileNumber && <span>· {item.mobileNumber}</span>}
                    </div>

                    <div className='mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2'>
                      <div className='flex items-center gap-1.5'>
                        {item.paymentAmountPaise === 0 ? (
                          <Badge variant='outline' className='border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px]'>
                            Free Allotment
                          </Badge>
                        ) : item.paymentStatus === 'paid' ? (
                          <Badge variant='outline' className='border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px]'>
                            Paid ({amount})
                          </Badge>
                        ) : (
                          <Badge variant='outline' className='border-amber-300 bg-amber-50 text-amber-800 text-[11px]'>
                            Payment Pending ({amount})
                          </Badge>
                        )}
                      </div>

                      {item.applicationNumber && (
                        <div className='flex flex-wrap items-center gap-1.5'>
                          {/* Copy Link */}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-[11px] gap-1'
                            onClick={() => copyPaymentLink(item.applicationNumber!)}
                          >
                            {copiedAppNo === item.applicationNumber ? (
                              <CheckIcon className='size-3 text-emerald-600' />
                            ) : (
                              <CopyIcon className='size-3' />
                            )}
                            {copiedAppNo === item.applicationNumber ? 'Copied' : 'Link'}
                          </Button>

                          {/* Print Letter */}
                          {item.applicationId && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 px-2 text-[11px] gap-1'
                              disabled={activeActionId?.id === item.applicationId && activeActionId.action === 'print'}
                              onClick={() => printAllotmentLetter(item.applicationId!)}
                            >
                              {activeActionId?.id === item.applicationId && activeActionId.action === 'print' ? (
                                <Loader2Icon className='size-3 animate-spin' />
                              ) : (
                                <PrinterIcon className='size-3' />
                              )}
                              Letter
                            </Button>
                          )}

                          {/* Send WhatsApp & Email Reminder */}
                          {item.applicationId && (
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 px-2 text-[11px] gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                              disabled={activeActionId?.id === item.applicationId && activeActionId.action === 'reminder'}
                              onClick={() => sendDirectReminder(item.applicationId!, item.applicationNumber!)}
                            >
                              {activeActionId?.id === item.applicationId && activeActionId.action === 'reminder' ? (
                                <Loader2Icon className='size-3 animate-spin' />
                              ) : (
                                <BellRingIcon className='size-3' />
                              )}
                              Reminder
                            </Button>
                          )}

                          {/* Regenerate Order if pending payment */}
                          {item.applicationId && item.paymentAmountPaise > 0 && item.paymentStatus !== 'paid' && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='h-7 px-2 text-[11px] gap-1 text-slate-600'
                              title='Regenerate Payment Order'
                              disabled={activeActionId?.id === item.applicationId && activeActionId.action === 'regenerate'}
                              onClick={() => regenerateDirectOrder(item.applicationId!, item.applicationNumber!)}
                            >
                              {activeActionId?.id === item.applicationId && activeActionId.action === 'regenerate' ? (
                                <Loader2Icon className='size-3 animate-spin' />
                              ) : (
                                <RefreshCwIcon className='size-3' />
                              )}
                            </Button>
                          )}

                          {/* Cancel Allotment */}
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-[11px] gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700'
                            title='Cancel Allotment'
                            disabled={activeActionId?.id === item.id && activeActionId.action === 'cancel'}
                            onClick={() => cancelDirectAllotment(item)}
                          >
                            {activeActionId?.id === item.id && activeActionId.action === 'cancel' ? (
                              <Loader2Icon className='size-3 animate-spin' />
                            ) : (
                              <BanIcon className='size-3' />
                            )}
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {listMessage && <p className='mt-3 text-xs font-semibold text-emerald-700'>{listMessage}</p>}
          {listError && <p className='mt-3 text-xs font-semibold text-destructive'>{listError}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
