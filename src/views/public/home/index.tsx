import { getFeeBreakdown, listOpenCategories } from '@/lib/applications/categories'
import { query } from '@/lib/db/client'
import PublicHomeClient from './PublicHomeClient'

interface CachedHomeData {
  categories: Array<{
    slug: string
    name: string
    nameHi: string | null
    description: string | null
    descriptionHi: string | null
    selectionMethod: 'draw' | 'manual' | 'auction' | 'tender' | 'application_fee'
    displayIndex: number
    feePaise: number | null
    feeBasePaise: number | null
    gstPercent: number | null
    allotmentAmountPaise: number | null
    allotmentAmountNote: string | null
    allotmentAmountNoteHi: string | null
    availableShopsCount: number
  }>
  eventStartsOn: string | null
  eventEndsOn: string | null
}

let cachedHomeData: CachedHomeData | null = null
let homeDataCachedAt = 0
const HOME_CACHE_TTL_MS = 30_000

/**
 * PublicHome server component that fetches category and event data from the DB
 * using parallel queries and a short in-memory cache to minimize latency over
 * remote database connections.
 */
const PublicHome = async () => {
  const now = Date.now()

  if (cachedHomeData && now - homeDataCachedAt < HOME_CACHE_TTL_MS) {
    return (
      <PublicHomeClient
        categories={cachedHomeData.categories}
        eventStartsOn={cachedHomeData.eventStartsOn}
        eventEndsOn={cachedHomeData.eventEndsOn}
      />
    )
  }

  // Fetch all 3 data sources in parallel instead of sequentially
  const [rawCategories, availableCounts, eventRows] = await Promise.all([
    listOpenCategories(),
    query<Array<{ category_id: number; available_count: number }>>(
      `SELECT category_id, COUNT(*) AS available_count FROM shop_units WHERE status = 'available' GROUP BY category_id`
    ),
    query<Array<{ starts_on: string | null; ends_on: string | null }>>(
      `SELECT starts_on, ends_on FROM events ORDER BY id ASC LIMIT 1`
    )
  ])

  const availableCountByCategory = new Map(availableCounts.map(row => [row.category_id, Number(row.available_count)]))

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

  const event = eventRows[0] ?? { starts_on: null, ends_on: null }

  cachedHomeData = {
    categories,
    eventStartsOn: event.starts_on,
    eventEndsOn: event.ends_on
  }
  homeDataCachedAt = now

  return (
    <PublicHomeClient categories={categories} eventStartsOn={event.starts_on} eventEndsOn={event.ends_on} />
  )
}

export default PublicHome
