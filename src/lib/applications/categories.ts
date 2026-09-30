import 'server-only'

import { query } from '@/lib/db/client'

export type CategoryRow = {
  id: number
  event_id: number
  slug: string
  name: string
  name_hi: string | null
  description: string | null
  description_hi: string | null
  selection_method: 'draw' | 'manual' | 'auction' | 'tender' | 'application_fee'
  fee_paise: number | null
  fee_base_paise: number | null
  gst_percent: number | string | null // MySQL DECIMAL columns arrive as strings via mysql2
  allotment_amount_paise: number | null
  allotment_amount_note: string | null
  allotment_amount_note_hi: string | null
  application_opens_at: string | null
  application_closes_at: string | null
  auction_date: string | null
  auction_venue: string | null
  auction_venue_hi: string | null
  status: 'draft' | 'open' | 'closed' | 'archived'
  display_order: number
}

export type ShopOptionRow = {
  id: number
  category_id: number
  label: string
  fee_paise: number | null
  display_order: number
}

export type FieldDefinitionRow = {
  id: number
  category_id: number
  field_key: string
  label: string
  label_hi: string | null
  input_type: 'text' | 'textarea' | 'select' | 'radio'
  is_required: 0 | 1
  max_length: number | null
  options_json: string | null
  display_order: number
}

export type DocumentDefinitionRow = {
  id: number
  category_id: number
  document_key: string
  label: string
  label_hi: string | null
  is_required: 0 | 1
  allowed_mime_types: string
  max_size_bytes: number
  display_order: number
}

/** Public listing: only categories currently open for application. */
export async function listOpenCategories(): Promise<CategoryRow[]> {
  return query<CategoryRow[]>(
    `SELECT * FROM categories
     WHERE status = 'open'
       AND (application_opens_at IS NULL OR application_opens_at <= NOW())
       AND (application_closes_at IS NULL OR application_closes_at >= NOW())
     ORDER BY display_order ASC`
  )
}

export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const rows = await query<CategoryRow[]>(`SELECT * FROM categories WHERE slug = ? LIMIT 1`, [slug])

  return rows[0] ?? null
}

export async function getCategoryById(id: number): Promise<CategoryRow | null> {
  const rows = await query<CategoryRow[]>(`SELECT * FROM categories WHERE id = ? LIMIT 1`, [id])

  return rows[0] ?? null
}

export async function getShopOptionsForCategory(categoryId: number): Promise<ShopOptionRow[]> {
  return query<ShopOptionRow[]>(
    `SELECT * FROM category_shop_options WHERE category_id = ? AND status = 'active' ORDER BY display_order ASC`,
    [categoryId]
  )
}

export async function getFieldDefinitionsForCategory(categoryId: number): Promise<FieldDefinitionRow[]> {
  return query<FieldDefinitionRow[]>(
    `SELECT * FROM category_field_definitions WHERE category_id = ? AND status = 'active' ORDER BY display_order ASC`,
    [categoryId]
  )
}

export async function getDocumentDefinitionsForCategory(categoryId: number): Promise<DocumentDefinitionRow[]> {
  return query<DocumentDefinitionRow[]>(
    `SELECT * FROM category_document_definitions WHERE category_id = ? AND status = 'active' ORDER BY display_order ASC`,
    [categoryId]
  )
}

export type FeeBreakdown = {
  totalPaise: number
  basePaise: number | null
  gstPercent: number | null
}

/**
 * Computes the fee breakdown to display for a category. `fee_paise` is
 * always the authoritative total (set directly, or as base+GST — see
 * migration 0005/0006); base/GST are shown alongside it only when
 * configured, so the UI can render "₹118 (₹100 + 18% GST)" when available
 * and just "₹118" for a category with only a flat total configured.
 * Returns null when no fee is configured at all — callers must render
 * "To be confirmed" only in that case, never as a default guess.
 */
export function getFeeBreakdown(category: CategoryRow): FeeBreakdown | null {
  if (category.fee_paise === null) return null

  return {
    totalPaise: category.fee_paise,
    basePaise: category.fee_base_paise,

    // Normalized to a real number here — MySQL DECIMAL columns arrive as
    // strings via mysql2, and every downstream consumer (API responses,
    // UI formatting) should be able to rely on a clean number | null.
    gstPercent: category.gst_percent === null ? null : Number(category.gst_percent)
  }
}

/** True if `now` falls within the category's application window (or the window is unbounded). */
export function isCategoryAcceptingApplications(category: CategoryRow, now: Date = new Date()): boolean {
  if (category.status !== 'open') return false

  if (category.application_opens_at && new Date(category.application_opens_at) > now) return false
  if (category.application_closes_at && new Date(category.application_closes_at) < now) return false

  return true
}
