import 'server-only'

import { query } from '@/lib/db/client'

/**
 * Whether the site-wide "Coming Soon" gate is on (site_mode_settings, set
 * from /admin/settings/coming-soon). Fails OPEN (false) if the table or DB
 * is unreachable — a broken settings read must never lock every visitor out
 * of the live site.
 */
export async function isComingSoonEnabled(): Promise<boolean> {
  try {
    const rows = await query<Array<{ coming_soon_enabled: number }>>(
      'SELECT coming_soon_enabled FROM site_mode_settings WHERE id = 1 LIMIT 1'
    )

    return Number(rows[0]?.coming_soon_enabled) === 1
  } catch {
    return false
  }
}
