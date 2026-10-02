import { getFeeBreakdown, listOpenCategories } from '@/lib/applications/categories'
import { query } from '@/lib/db/client'
import PublicHomeClient from './PublicHomeClient'

/**
 * PublicHome server component that fetches category data from the DB
 * and hands off to PublicHomeClient for bilingual language switching (Hindi/English).
 */
const PublicHome = async () => {
  const rawCategories = await listOpenCategories()

  // Available-shop counts per category, from the real inventory
  // (shop_units — see migration 0016_shop_inventory.sql). A category with
  // no imported inventory yet simply shows 0 rather than hiding the count,
  // since "no stalls configured yet" is accurate information, not an error.
  const availableCounts = await query<Array<{ category_id: number; available_count: number }>>(
    `SELECT category_id, COUNT(*) AS available_count FROM shop_units WHERE status = 'available' GROUP BY category_id`
  )

  const availableCountByCategory = new Map(availableCounts.map(row => [row.category_id, row.available_count]))

  const categories = rawCategories.map((category, index) => {
    const fee = getFeeBreakdown(category)

    return {
      slug: category.slug,
      name: category.name,
      nameHi: category.name_hi,
      description: category.description,
      descriptionHi: category.description_hi,
      selectionMethod: category.selection_method,
      displayIndex: index + 1,
      feePaise: fee?.totalPaise ?? null,
      feeBasePaise: fee?.basePaise ?? null,
      gstPercent: fee?.gstPercent ?? null,
      allotmentAmountPaise: category.allotment_amount_paise,
      allotmentAmountNote: category.allotment_amount_note,
      allotmentAmountNoteHi: category.allotment_amount_note_hi,
      availableShopsCount: availableCountByCategory.get(category.id) ?? 0
    }
  })

  // Event-wide application window shown in the hero slider — distinct from
  // any single category's own open/close dates (categories.application_
  // opens_at/closes_at). Currently unset; the hero shows "to be announced"
  // rather than inventing placeholder dates until this is configured.
  const eventRows = await query<Array<{ starts_on: string | null; ends_on: string | null }>>(
    `SELECT starts_on, ends_on FROM events ORDER BY id ASC LIMIT 1`
  )

  const event = eventRows[0] ?? { starts_on: null, ends_on: null }

  return (
    <PublicHomeClient categories={categories} eventStartsOn={event.starts_on} eventEndsOn={event.ends_on} />
  )
}

export default PublicHome
