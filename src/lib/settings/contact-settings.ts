import 'server-only'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'

export type ContactSettings = {
  phone: string | null
  email: string | null
  whatsappNumber: string | null
  address: string | null
  addressHi: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  twitterUrl: string | null
}

// Same placeholder values the public site previously hardcoded in
// PublicHeader.tsx/PublicFooter.tsx/FloatingContactButtons.tsx/
// ContactBannerSection.tsx — used only if the single settings row is
// somehow missing (migration 0022 seeds it, so this is defence in depth,
// not the expected path) so the public site never renders a blank phone/
// email rather than failing loudly.
const FALLBACK: ContactSettings = {
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

type Row = {
  phone: string | null
  email: string | null
  whatsapp_number: string | null
  address: string | null
  address_hi: string | null
  facebook_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  twitter_url: string | null
}

/**
 * The single site-wide contact-settings row — see migration 0022. Read by
 * PublicLayout (src/app/(public)/layout.tsx), which wraps every public page
 * including several that are otherwise static (no DB call of their own) —
 * so a DB outage (or, during a build, DB_HOST simply not being configured
 * for that build environment) must never fail the build or the page.
 * Falling back to the same placeholder values the public site used to
 * hardcode is a safe degrade for what is cosmetic contact info, not
 * something correctness-critical.
 */
export async function getContactSettings(): Promise<ContactSettings> {
  try {
    const rows = await query<Row[]>(
      `SELECT phone, email, whatsapp_number, address, address_hi, facebook_url, instagram_url, youtube_url, twitter_url
       FROM site_contact_settings WHERE id = 1 LIMIT 1`
    )

    const row = rows[0]

    if (!row) return FALLBACK

    return {
      phone: row.phone,
      email: row.email,
      whatsappNumber: row.whatsapp_number,
      address: row.address,
      addressHi: row.address_hi,
      facebookUrl: row.facebook_url,
      instagramUrl: row.instagram_url,
      youtubeUrl: row.youtube_url,
      twitterUrl: row.twitter_url
    }
  } catch (error) {
    logServerError('settings.contact.read', error)

    return FALLBACK
  }
}
