import 'server-only'

import { query, type TransactionQuery } from '@/lib/db/client'

/**
 * Whether ANY category's draw has been completed — gates the site-wide
 * "Results declared" banner (src/views/public/home, src/views/public/status).
 * Deliberately not per-category: one global banner for "results are out, go
 * check your application" regardless of which category drew first, per
 * explicit request.
 */
export async function anyDrawCompleted(runQuery: TransactionQuery = query): Promise<boolean> {
  const rows = await runQuery<Array<{ declared: number }>>(
    `SELECT EXISTS(SELECT 1 FROM draw_events WHERE status = 'completed') AS declared`
  )

  return Boolean(rows[0]?.declared)
}

export type ResultsBannerSettings = {
  textEn: string
  textHi: string
}

/** The single admin-editable banner message (always row id = 1). */
export async function getResultsBannerSettings(runQuery: TransactionQuery = query): Promise<ResultsBannerSettings> {
  const rows = await runQuery<Array<{ text_en: string; text_hi: string }>>(
    `SELECT text_en, text_hi FROM results_banner_settings WHERE id = 1 LIMIT 1`
  )

  const row = rows[0]

  return { textEn: row?.text_en ?? '', textHi: row?.text_hi ?? '' }
}
