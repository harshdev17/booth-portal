import 'server-only'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'

export type CorrigendumNoticeRow = {
  particular: string
  particularHi: string
  previous: string
  previousHi: string
  revised: string
  revisedHi: string
}

/**
 * Public read for the homepage popup (src/components/public/CorrigendumNoticeModal.tsx)
 * — fetched once in the public layout (a Server Component) and passed down
 * as props, same pattern as getContactSettings(). Returns enabled: false
 * (and no rows) if the settings row is somehow missing, so a bad deploy
 * fails closed (no popup) rather than crashing the homepage.
 */
export type CorrigendumNoticeText = {
  heading: string
  headingHi: string
  subheading: string
  subheadingHi: string
  footerText: string
  footerTextHi: string
}

const DEFAULT_TEXT: CorrigendumNoticeText = {
  heading: 'Important Notice',
  headingHi: 'महत्वपूर्ण सूचना',
  subheading: 'Revised Schedule',
  subheadingHi: 'संशोधित कार्यक्रम',
  footerText: 'Applicants who have already submitted their applications successfully need not apply again.',
  footerTextHi: 'जिन आवेदकों ने पहले ही अपना आवेदन सफलतापूर्वक जमा कर दिया है, उन्हें दोबारा आवेदन करने की जरूरत नहीं है।'
}

export async function getCorrigendumNoticeData(): Promise<
  { enabled: boolean; rows: CorrigendumNoticeRow[] } & CorrigendumNoticeText
> {
  try {
    const settingsRows = await query<
      Array<{
        enabled: number
        heading: string
        heading_hi: string
        subheading: string
        subheading_hi: string
        footer_text: string
        footer_text_hi: string
      }>
    >(
      `SELECT enabled, heading, heading_hi, subheading, subheading_hi, footer_text, footer_text_hi
       FROM corrigendum_notice_settings WHERE id = 1 LIMIT 1`
    )

    const settings = settingsRows[0]
    const enabled = Boolean(settings?.enabled)

    const text: CorrigendumNoticeText = settings
      ? {
          heading: settings.heading,
          headingHi: settings.heading_hi,
          subheading: settings.subheading,
          subheadingHi: settings.subheading_hi,
          footerText: settings.footer_text,
          footerTextHi: settings.footer_text_hi
        }
      : DEFAULT_TEXT

    if (!enabled) return { enabled: false, rows: [], ...text }

    const rows = await query<
      Array<{
        particular: string
        particular_hi: string
        previous_text: string
        previous_text_hi: string
        revised_text: string
        revised_text_hi: string
      }>
    >(
      `SELECT particular, particular_hi, previous_text, previous_text_hi, revised_text, revised_text_hi
       FROM corrigendum_notice_rows
       WHERE status = 'active'
       ORDER BY display_order ASC, id ASC`
    )

    return {
      enabled: enabled && rows.length > 0,
      rows: rows.map(r => ({
        particular: r.particular,
        particularHi: r.particular_hi,
        previous: r.previous_text,
        previousHi: r.previous_text_hi,
        revised: r.revised_text,
        revisedHi: r.revised_text_hi
      })),
      ...text
    }
  } catch (error) {
    // Same defensive fallback as getContactSettings() — a DB outage (or, at
    // build time, no DB connection at all for a statically-prerendered
    // public page like /print-application, which shares this layout) must
    // never fail the whole public layout; it just means no popup that time.
    logServerError('homepage.corrigendum-notice', error)

    return { enabled: false, rows: [], ...DEFAULT_TEXT }
  }
}
