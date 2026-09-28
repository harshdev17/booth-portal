'use client'

import { useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, SaveIcon } from 'lucide-react'

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

                  return (
                    <tr key={cat.id} className='hover:bg-muted/30 transition'>
                      <td className='py-4 px-4'>
                        <p className='font-bold text-[#0c2847]'>{cat.name}</p>
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
                      </td>
                    </tr>
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
