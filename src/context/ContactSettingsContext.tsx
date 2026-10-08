'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { ContactSettings } from '@/lib/settings/contact-settings'

// Default used only if a consumer somehow renders outside the provider
// (shouldn't happen — PublicLayout always wraps the public site) — mirrors
// getContactSettings()'s own fallback (src/lib/settings/contact-settings.ts)
// without importing that server-only module into a client bundle.
const DEFAULT_SETTINGS: ContactSettings = {
  phone: '+919876543210',
  email: 'helpdesk@stallportal.in',
  whatsappNumber: '919876543210',
  address: 'Kurukshetra, Haryana – 136118',
  addressHi: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  twitterUrl: null
}

const ContactSettingsContext = createContext<ContactSettings>(DEFAULT_SETTINGS)

/**
 * Makes the admin-configurable phone/email/WhatsApp/address/social-link
 * values (migration 0022, /admin/settings/contact) available to every
 * public-site client component without each page having to fetch or
 * prop-drill them — PublicLayout (a Server Component) fetches once via
 * getContactSettings() and passes the result in here.
 */
export const ContactSettingsProvider = ({ settings, children }: { settings: ContactSettings; children: ReactNode }) => (
  <ContactSettingsContext.Provider value={settings}>{children}</ContactSettingsContext.Provider>
)

export const useContactSettings = () => useContext(ContactSettingsContext)
