import type { Metadata } from 'next'

import { getContactSettings } from '@/lib/settings/contact-settings'
import { requirePermission } from '@/lib/rbac/authorize'
import ContactSettingsClient from '@/views/admin/settings/ContactSettingsClient'

export const metadata: Metadata = {
  title: 'Contact & Social Settings — IGM Admin Portal'
}

const ContactSettingsPage = async () => {
  await requirePermission('config:manage')

  const settings = await getContactSettings()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Contact & Social Settings</h1>
        <p className='text-sm text-muted-foreground'>
          The phone number, email, WhatsApp number, address, and social media links shown across the public site
          (header, footer, floating buttons, and the homepage contact section) — change them here, once, instead of
          per page.
        </p>
      </div>

      <ContactSettingsClient settings={settings} />
    </div>
  )
}

export default ContactSettingsPage
