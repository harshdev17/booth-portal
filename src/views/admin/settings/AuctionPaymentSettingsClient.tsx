'use client'

import { useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import type { AuctionPaymentSettings } from '@/lib/settings/auction-payment'

type FormState = {
  beneficiaryName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branchName: string
  accountType: string
  paymentMode: string
  instructionsText: string
  instructionsTextHi: string
  noticeText: string
  noticeTextHi: string
  googleFormUrl: string
}

const toFormState = (settings: AuctionPaymentSettings): FormState => ({
  beneficiaryName: settings.beneficiaryName ?? '',
  bankName: settings.bankName ?? '',
  accountNumber: settings.accountNumber ?? '',
  ifscCode: settings.ifscCode ?? '',
  branchName: settings.branchName ?? '',
  accountType: settings.accountType ?? '',
  paymentMode: settings.paymentMode ?? '',
  instructionsText: settings.instructionsText ?? '',
  instructionsTextHi: settings.instructionsTextHi ?? '',
  noticeText: settings.noticeText ?? '',
  noticeTextHi: settings.noticeTextHi ?? '',
  googleFormUrl: settings.googleFormUrl ?? ''
})

const AuctionPaymentSettingsClient = ({ settings }: { settings: AuctionPaymentSettings }) => {
  const [enabled, setEnabled] = useState(settings.enabled)
  const [showInHeader, setShowInHeader] = useState(settings.showInHeader)
  const [isSavingToggle, setIsSavingToggle] = useState<'enabled' | 'showInHeader' | null>(null)

  const [form, setForm] = useState<FormState>(toFormState(settings))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const handleToggle = async (field: 'enabled' | 'showInHeader', value: boolean) => {
    const revert = field === 'enabled' ? setEnabled : setShowInHeader

    revert(value)
    setIsSavingToggle(field)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings/auction-payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })

      const data = await response.json()

      if (!response.ok) {
        revert(!value)
        setError(data.error ?? 'Failed to update.')
      }
    } catch {
      revert(!value)
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsSavingToggle(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)

    try {
      const response = await fetch('/api/admin/settings/auction-payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryName: form.beneficiaryName.trim() || null,
          bankName: form.bankName.trim() || null,
          accountNumber: form.accountNumber.trim() || null,
          ifscCode: form.ifscCode.trim() || null,
          branchName: form.branchName.trim() || null,
          accountType: form.accountType.trim() || null,
          paymentMode: form.paymentMode.trim() || null,
          instructionsText: form.instructionsText.trim() || null,
          instructionsTextHi: form.instructionsTextHi.trim() || null,
          noticeText: form.noticeText.trim() || null,
          noticeTextHi: form.noticeTextHi.trim() || null,
          googleFormUrl: form.googleFormUrl.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to save changes.')

        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {error && (
        <Alert variant='destructive'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Visibility</CardTitle>
          <CardDescription>Each switch saves immediately — no separate Save button for these.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <div className='flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3'>
            <div>
              <p className='font-semibold text-[#0c2847]'>Page Enabled</p>
              <p className='text-xs text-muted-foreground'>
                When off, /auction-payment shows a &ldquo;Coming Soon&rdquo; notice instead of this content.
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={isSavingToggle === 'enabled'}
              onCheckedChange={checked => handleToggle('enabled', checked)}
            />
          </div>
          <div className='flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3'>
            <div>
              <p className='font-semibold text-[#0c2847]'>Show Link in Header</p>
              <p className='text-xs text-muted-foreground'>
                Controls only the &ldquo;Auction Payment&rdquo; nav link in the public header — the page stays reachable by
                direct URL even when this is off.
              </p>
            </div>
            <Switch
              checked={showInHeader}
              disabled={isSavingToggle === 'showInHeader'}
              onCheckedChange={checked => handleToggle('showInHeader', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Bank Account Details</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <Field className='sm:col-span-2'>
            <FieldLabel>Beneficiary Name (To)</FieldLabel>
            <Input value={form.beneficiaryName} onChange={e => set('beneficiaryName', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Bank Name</FieldLabel>
            <Input value={form.bankName} onChange={e => set('bankName', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Account Number</FieldLabel>
            <Input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>IFSC Code</FieldLabel>
            <Input value={form.ifscCode} onChange={e => set('ifscCode', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Branch Name</FieldLabel>
            <Input value={form.branchName} onChange={e => set('branchName', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Account Type</FieldLabel>
            <Input value={form.accountType} onChange={e => set('accountType', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Payment Mode</FieldLabel>
            <Input value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Important Instructions</CardTitle>
          <CardDescription>One instruction per line — shown as a bulleted list on the public page.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <Field>
            <FieldLabel>English</FieldLabel>
            <Textarea rows={6} value={form.instructionsText} onChange={e => set('instructionsText', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Hindi</FieldLabel>
            <Textarea rows={6} value={form.instructionsTextHi} onChange={e => set('instructionsTextHi', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Important Payment Notice</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <Field>
            <FieldLabel>English</FieldLabel>
            <Textarea rows={4} value={form.noticeText} onChange={e => set('noticeText', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Hindi</FieldLabel>
            <Textarea rows={4} value={form.noticeTextHi} onChange={e => set('noticeTextHi', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Submission Form Link</CardTitle>
          <CardDescription>
            Shown as a &ldquo;Submit Payment Details&rdquo; button on the public page, opening this link in a new tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel>Google Form URL</FieldLabel>
            <Input
              type='text'
              placeholder='https://forms.gle/...'
              value={form.googleFormUrl}
              onChange={e => set('googleFormUrl', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className='flex items-center gap-3'>
        <Button type='button' disabled={isSaving} onClick={handleSave}>
          {isSaving && <Loader2Icon className='size-4 animate-spin' />}
          Save Changes
        </Button>
        {saved && (
          <span className='inline-flex items-center gap-1 text-sm font-medium text-green-700'>
            <CheckCircle2Icon className='size-4' /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

export default AuctionPaymentSettingsClient
