'use client'

import { useState } from 'react'

import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, SaveIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ContactSettings } from '@/lib/settings/contact-settings'

type FormState = {
  phone: string
  email: string
  whatsappNumber: string
  address: string
  addressHi: string
  facebookUrl: string
  instagramUrl: string
  youtubeUrl: string
  twitterUrl: string
}

const toFormState = (s: ContactSettings): FormState => ({
  phone: s.phone ?? '',
  email: s.email ?? '',
  whatsappNumber: s.whatsappNumber ?? '',
  address: s.address ?? '',
  addressHi: s.addressHi ?? '',
  facebookUrl: s.facebookUrl ?? '',
  instagramUrl: s.instagramUrl ?? '',
  youtubeUrl: s.youtubeUrl ?? '',
  twitterUrl: s.twitterUrl ?? ''
})

const ContactSettingsClient = ({ settings }: { settings: ContactSettings }) => {
  const [form, setForm] = useState<FormState>(toFormState(settings))
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/settings/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Contact settings saved — the public site now reflects these values.')
      } else {
        setErrorMessage(data.error ?? 'Failed to save contact settings.')
      }
    } catch {
      setErrorMessage('Could not connect to server. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {successMessage && (
        <Alert className='rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800'>
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
          <CardTitle className='text-base font-bold text-[#0c2847]'>Primary Contact</CardTitle>
          <CardDescription className='text-xs'>
            Shown in the header, footer, floating call/WhatsApp buttons, and the homepage contact section.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='phone'>Phone Number</Label>
            <Input id='phone' value={form.phone} onChange={set('phone')} placeholder='+919876543210' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='whatsappNumber'>WhatsApp Number</Label>
            <Input
              id='whatsappNumber'
              value={form.whatsappNumber}
              onChange={set('whatsappNumber')}
              placeholder='919876543210'
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' value={form.email} onChange={set('email')} placeholder='helpdesk@stallportal.in' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='address'>Address (English)</Label>
            <Input id='address' value={form.address} onChange={set('address')} placeholder='Kurukshetra, Haryana – 136118' />
          </div>
          <div className='flex flex-col gap-1.5 sm:col-span-2'>
            <Label htmlFor='addressHi'>Address (Hindi) — optional</Label>
            <Input id='addressHi' value={form.addressHi} onChange={set('addressHi')} placeholder='कुरुक्षेत्र, हरियाणा – 136118' />
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Social Media Links</CardTitle>
          <CardDescription className='text-xs'>
            Shown as icons in the footer. Leave a field blank to hide that icon.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='facebookUrl'>Facebook URL</Label>
            <Input id='facebookUrl' value={form.facebookUrl} onChange={set('facebookUrl')} placeholder='https://facebook.com/...' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='instagramUrl'>Instagram URL</Label>
            <Input id='instagramUrl' value={form.instagramUrl} onChange={set('instagramUrl')} placeholder='https://instagram.com/...' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='youtubeUrl'>YouTube URL</Label>
            <Input id='youtubeUrl' value={form.youtubeUrl} onChange={set('youtubeUrl')} placeholder='https://youtube.com/...' />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='twitterUrl'>X / Twitter URL</Label>
            <Input id='twitterUrl' value={form.twitterUrl} onChange={set('twitterUrl')} placeholder='https://x.com/...' />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className='w-fit rounded-lg bg-[#0c2847] text-xs font-bold text-white hover:bg-[#071f3a]'
      >
        {isSaving ? <Loader2Icon className='mr-1.5 size-3.5 animate-spin' /> : <SaveIcon className='mr-1.5 size-3.5' />}
        Save Changes
      </Button>
    </div>
  )
}

export default ContactSettingsClient
