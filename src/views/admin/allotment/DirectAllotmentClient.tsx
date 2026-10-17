'use client'

import { useMemo, useState } from 'react'

import { PlusIcon, StoreIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Category = { id: number; name: string }
type Stall = { id: number; categoryId: number; stallNumber: string; shopType: string; direction: string | null }
type Existing = { id: number; categoryName: string; stallNumber: string; allotteeName: string; contactPerson: string | null; mobileNumber: string | null; allottedAt: string }

export default function DirectAllotmentClient({ initialCategories, stalls, existing }: { initialCategories: Category[]; stalls: Stall[]; existing: Existing[] }) {
  const [categories, setCategories] = useState(initialCategories)
  const [categoryId, setCategoryId] = useState<number>(initialCategories[0]?.id ?? 0)
  const [categoryName, setCategoryName] = useState('')
  const [form, setForm] = useState({ shopUnitId: '', allotteeName: '', contactPerson: '', mobileNumber: '', notes: '' })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const availableStalls = useMemo(() => stalls.filter(stall => stall.categoryId === categoryId), [stalls, categoryId])

  const createCategory = async () => {
    setError(null); setMessage(null)
    const response = await fetch('/api/admin/direct-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: categoryName }) })
    const data = await response.json()
    if (!response.ok) return setError(data.error ?? 'Could not create category.')
    setCategories(current => [...current, { id: data.id, name: data.name }])
    setCategoryId(data.id); setCategoryName(''); setMessage('Category created. Now add its stalls from Inventory, then return here to allot them.')
  }

  const allot = async () => {
    setError(null); setMessage(null); setSaving(true)
    try {
      const response = await fetch('/api/admin/direct-allotments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId, shopUnitId: Number(form.shopUnitId), allotteeName: form.allotteeName, contactPerson: form.contactPerson, mobileNumber: form.mobileNumber, notes: form.notes }) })
      const data = await response.json()
      if (!response.ok) return setError(data.error ?? 'Could not allot stall.')
      setMessage(`Stall ${data.stallNumber} allotted successfully. Refreshing the list…`)
      window.location.reload()
    } finally { setSaving(false) }
  }

  const [interchangeFirstId, setInterchangeFirstId] = useState<string>('')
  const [interchangeSecondId, setInterchangeSecondId] = useState<string>('')
  const [interchangeReason, setInterchangeReason] = useState('')
  const [interchangeSaving, setInterchangeSaving] = useState(false)
  const [interchangeError, setInterchangeError] = useState<string | null>(null)
  const [interchangeMessage, setInterchangeMessage] = useState<string | null>(null)

  const interchange = async () => {
    setInterchangeError(null); setInterchangeMessage(null); setInterchangeSaving(true)
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
    } finally { setInterchangeSaving(false) }
  }

  return <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'>
    <div className='space-y-6'>
      <Card><CardHeader><CardTitle className='text-base'>Create Direct Category</CardTitle><CardDescription>Public application form will stay closed for this category.</CardDescription></CardHeader><CardContent className='flex gap-2'><Input value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder='e.g. Government Pavilion' /><Button type='button' onClick={createCategory}><PlusIcon /> Create</Button></CardContent></Card>
      <Card><CardHeader><CardTitle className='text-base'>Direct Stall Allotment</CardTitle><CardDescription>Select a direct category, available stall, and allottee.</CardDescription></CardHeader><CardContent className='space-y-4'>
        <div className='grid gap-1.5'><Label>Category</Label><select value={categoryId} onChange={e => { setCategoryId(Number(e.target.value)); setForm(current => ({ ...current, shopUnitId: '' })) }} className='h-10 rounded-md border border-input bg-background px-3 text-sm'><option value={0}>Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
        <div className='grid gap-1.5'><Label>Available Booth/Stall</Label><select value={form.shopUnitId} onChange={e => setForm(current => ({ ...current, shopUnitId: e.target.value }))} className='h-10 rounded-md border border-input bg-background px-3 text-sm' disabled={!categoryId}><option value=''>Select available stall</option>{availableStalls.map(stall => <option key={stall.id} value={stall.id}>{stall.stallNumber} · {stall.shopType}{stall.direction ? ` · ${stall.direction}` : ''}</option>)}</select>{categoryId && availableStalls.length === 0 && <p className='text-xs text-muted-foreground'>No available stalls. Add/import stalls under this category in Inventory first.</p>}</div>
        <div className='grid gap-1.5'><Label>Organisation / Allottee name</Label><Input value={form.allotteeName} onChange={e => setForm(current => ({ ...current, allotteeName: e.target.value }))} /></div>
        <div className='grid gap-4 sm:grid-cols-2'><div className='grid gap-1.5'><Label>Contact person</Label><Input value={form.contactPerson} onChange={e => setForm(current => ({ ...current, contactPerson: e.target.value }))} /></div><div className='grid gap-1.5'><Label>Mobile</Label><Input value={form.mobileNumber} onChange={e => setForm(current => ({ ...current, mobileNumber: e.target.value }))} /></div></div>
        <div className='grid gap-1.5'><Label>Note (optional)</Label><Textarea value={form.notes} onChange={e => setForm(current => ({ ...current, notes: e.target.value }))} /></div>
        {error && <p className='text-sm text-destructive'>{error}</p>}{message && <p className='text-sm text-emerald-700'>{message}</p>}
        <Button type='button' onClick={allot} disabled={saving || !categoryId || !form.shopUnitId || !form.allotteeName}>{saving ? 'Allotting…' : 'Allot Stall'}</Button>
      </CardContent></Card>
      <Card><CardHeader><CardTitle className='text-base'>Interchange Two Allotted Stalls</CardTitle><CardDescription>Swap stall assignments between two active direct allottees with audit history.</CardDescription></CardHeader><CardContent className='space-y-4'>
        {existing.length < 2 ? (
          <p className='text-xs text-muted-foreground'>At least two active direct allotments are needed to perform an interchange.</p>
        ) : (
          <>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-1.5'>
                <Label>First Allotment</Label>
                <select value={interchangeFirstId} onChange={e => setInterchangeFirstId(e.target.value)} className='h-10 rounded-md border border-input bg-background px-3 text-sm'>
                  <option value=''>Select allotment</option>
                  {existing.map(item => <option key={item.id} value={item.id} disabled={String(item.id) === interchangeSecondId}>{item.stallNumber} · {item.allotteeName}</option>)}
                </select>
              </div>
              <div className='grid gap-1.5'>
                <Label>Second Allotment</Label>
                <select value={interchangeSecondId} onChange={e => setInterchangeSecondId(e.target.value)} className='h-10 rounded-md border border-input bg-background px-3 text-sm'>
                  <option value=''>Select allotment</option>
                  {existing.map(item => <option key={item.id} value={item.id} disabled={String(item.id) === interchangeFirstId}>{item.stallNumber} · {item.allotteeName}</option>)}
                </select>
              </div>
            </div>
            <div className='grid gap-1.5'>
              <Label>Reason for interchange</Label>
              <Textarea value={interchangeReason} onChange={e => setInterchangeReason(e.target.value)} placeholder='Official justification / memo reference for swapping stalls' />
            </div>
            {interchangeError && <p className='text-sm text-destructive'>{interchangeError}</p>}
            {interchangeMessage && <p className='text-sm text-emerald-700'>{interchangeMessage}</p>}
            <Button type='button' variant='outline' onClick={interchange} disabled={interchangeSaving || !interchangeFirstId || !interchangeSecondId || interchangeFirstId === interchangeSecondId || !interchangeReason.trim()}>{interchangeSaving ? 'Interchanging…' : 'Interchange Stalls'}</Button>
          </>
        )}
      </CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle className='flex items-center gap-2 text-base'><StoreIcon className='size-4' /> Direct Allotments</CardTitle><CardDescription>Current direct/admin-created allotments.</CardDescription></CardHeader><CardContent>{existing.length === 0 ? <p className='py-8 text-center text-sm text-muted-foreground'>No direct allotments yet.</p> : <div className='space-y-3'>{existing.map(item => <div key={item.id} className='rounded-md border p-3'><div className='flex justify-between gap-3'><p className='font-semibold text-[#0c2847]'>{item.allotteeName}</p><span className='font-mono text-sm font-bold'>{item.stallNumber}</span></div><p className='mt-1 text-xs text-muted-foreground'>{item.categoryName}{item.contactPerson ? ` · ${item.contactPerson}` : ''}{item.mobileNumber ? ` · ${item.mobileNumber}` : ''}</p></div>)}</div>}</CardContent></Card>
  </div>
}
