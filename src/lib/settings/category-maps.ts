import 'server-only'

import { query } from '@/lib/db/client'

export type CategoryMapRow = {
  categoryId: number | null
  categorySlug: string | null
  categoryName: string | null
  categoryNameHi: string | null
  displayOrder: number | null
  pdfPath: string
  originalFilename: string | null
  updatedAt: string | null
}

let cachedCategoryMaps: { fullMap: CategoryMapRow | null; byCategory: CategoryMapRow[] } | null = null
let categoryMapsCachedAt = 0
const CATEGORY_MAPS_TTL_MS = 60_000

export function clearCategoryMapsCache(): void {
  cachedCategoryMaps = null
  categoryMapsCachedAt = 0
}

/**
 * Stall/Booth location maps: one optional PDF per open category, plus a
 * single "Full Map" row (category_id IS NULL). Read by the public
 * /stall-booth-locations page, the per-category "Map" links shown on
 * Guidelines/category-detail/apply pages, and the admin settings page that
 * lets an admin replace any of these PDFs (migration 0047).
 *
 * Categories with no uploaded map simply don't appear in the per-category
 * list — there's nothing to invent per the no-assumptions rule.
 */
export async function listCategoryMaps(): Promise<{ fullMap: CategoryMapRow | null; byCategory: CategoryMapRow[] }> {
  const now = Date.now()

  if (cachedCategoryMaps && now - categoryMapsCachedAt < CATEGORY_MAPS_TTL_MS) {
    return cachedCategoryMaps
  }

  const rows = await query<
    Array<{
      category_id: number | null
      slug: string | null
      name: string | null
      name_hi: string | null
      display_order: number | null
      pdf_path: string
      original_filename: string | null
      updated_at: string | null
    }>
  >(
    `SELECT cm.category_id, c.slug, c.name, c.name_hi, c.display_order, cm.pdf_path, cm.original_filename, cm.updated_at
     FROM category_maps cm
     LEFT JOIN categories c ON c.id = cm.category_id
     WHERE cm.category_id IS NULL OR c.status = 'open'
     ORDER BY cm.category_id IS NULL DESC, c.display_order ASC`
  )

  const mapped = rows.map(row => ({
    categoryId: row.category_id,
    categorySlug: row.slug,
    categoryName: row.name,
    categoryNameHi: row.name_hi,
    displayOrder: row.display_order,
    pdfPath: row.pdf_path,
    originalFilename: row.original_filename,
    updatedAt: row.updated_at
  }))

  const result = {
    fullMap: mapped.find(row => row.categoryId === null) ?? null,
    byCategory: mapped.filter((row): row is CategoryMapRow & { categoryId: number } => row.categoryId !== null)
  }

  cachedCategoryMaps = result
  categoryMapsCachedAt = now

  return result
}

/** The map PDF for one specific category, if an admin has uploaded one. */
export async function getCategoryMapBySlug(slug: string): Promise<CategoryMapRow | null> {
  const { byCategory } = await listCategoryMaps()

  return byCategory.find(row => row.categorySlug === slug) ?? null
}

export type CategoryWithOptionalMap = {
  categoryId: number
  categorySlug: string
  categoryName: string
  categoryNameHi: string | null
  displayOrder: number
  pdfPath: string | null
  originalFilename: string | null
  updatedAt: string | null
}

/**
 * Every open category (not just the ones that already have a map), for the
 * admin settings page — an admin needs to see and fill in the gap for a
 * category with no map yet, not just manage the ones already uploaded.
 */
export async function listOpenCategoriesWithMaps(): Promise<CategoryWithOptionalMap[]> {
  const rows = await query<
    Array<{
      id: number
      slug: string
      name: string
      name_hi: string | null
      display_order: number
      pdf_path: string | null
      original_filename: string | null
      updated_at: string | null
    }>
  >(
    `SELECT c.id, c.slug, c.name, c.name_hi, c.display_order, cm.pdf_path, cm.original_filename, cm.updated_at
     FROM categories c
     LEFT JOIN category_maps cm ON cm.category_id = c.id
     WHERE c.status = 'open'
     ORDER BY c.display_order ASC`
  )

  return rows.map(row => ({
    categoryId: row.id,
    categorySlug: row.slug,
    categoryName: row.name,
    categoryNameHi: row.name_hi,
    displayOrder: row.display_order,
    pdfPath: row.pdf_path,
    originalFilename: row.original_filename,
    updatedAt: row.updated_at
  }))
}
