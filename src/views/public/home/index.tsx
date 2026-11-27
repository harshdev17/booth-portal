import ResultsDeclaredBanner from '@/components/public/ResultsDeclaredBanner'
import { getFeeBreakdown, getPortalApplicationSchedule, listOpenCategories } from '@/lib/applications/categories'
import { withPooledConnection } from '@/lib/db/client'
import { anyDrawCompleted, getResultsBannerSettings } from '@/lib/draw/results-declared'
import { parseIstDateTime } from '@/lib/format-date'
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
    badgeLabel: string
    feePaise: number | null
    feeBasePaise: number | null
    gstPercent: number | null
    allotmentAmountPaise: number | null
    allotmentAmountNote: string | null
    allotmentAmountNoteHi: string | null
    availableShopsCount: number
    isApplicationClosed: boolean
    externalApplyUrl: string | null
    pdfPath: string | null
    totalBooths: number | null
    lastDate: string | null
  }>
  eventStartsOn: string | null
  eventEndsOn: string | null
  applicationOpensAt: string | null
  applicationClosesAt: string | null
  resultsDeclared: boolean
  resultsBannerTextEn: string
  resultsBannerTextHi: string
}

let cachedHomeData: CachedHomeData | null = null
let homeDataCachedAt = 0

// Temporarily dropped to effectively "off" (2026-11-27) while diagnosing a
// report that a category's show_on_homepage=0 change wasn't reflecting live
// on production for several minutes, well past the old 30s window —
// confirmed the DB value itself was correct the whole time via direct query,
// so this in-memory cache (or a stale server process holding it) was the
// remaining suspect. Revert to 30_000 once confirmed this was the cause.
const HOME_CACHE_TTL_MS = 1

/**
 * PublicHome server component that fetches category and event data from the DB
 * using parallel queries and a short in-memory cache to minimize latency over
 * remote database connections.
 */
const PublicHome = async () => {
  const now = Date.now()

  if (cachedHomeData && now - homeDataCachedAt < HOME_CACHE_TTL_MS) {
    return (
      <>
        <ResultsDeclaredBanner
          show={cachedHomeData.resultsDeclared}
          textEn={cachedHomeData.resultsBannerTextEn}
          textHi={cachedHomeData.resultsBannerTextHi}
        />
        <PublicHomeClient
          categories={cachedHomeData.categories}
          eventStartsOn={cachedHomeData.eventStartsOn}
          eventEndsOn={cachedHomeData.eventEndsOn}
          applicationOpensAt={cachedHomeData.applicationOpensAt}
          applicationClosesAt={cachedHomeData.applicationClosesAt}
        />
      </>
    )
  }

  // All reads share ONE pooled connection instead of each checking out its
  // own — this is the single most-visited public page, so its old 4-way
  // Promise.all fan-out (run once per HOME_CACHE_TTL_MS window, but still 4
  // simultaneous connections every time the cache expires) was a meaningful
  // contributor to Hostinger's connection cap (see .ai/CHANGELOG.md
  // 2026-11-14, same pattern as the admin dashboard/list pages). The
  // "Results declared" banner check is folded into this same batch rather
  // than adding a new separate connection.
  const [rawCategories, availableCounts, eventRows, schedule, resultsDeclared, bannerSettings] =
    await withPooledConnection(query =>
      Promise.all([
        listOpenCategories(query),
        query<Array<{ category_id: number; available_count: number }>>(
          `SELECT category_id, COUNT(*) AS available_count FROM shop_units WHERE status = 'available' GROUP BY category_id`
        ),
        query<Array<{ starts_on: string | null; ends_on: string | null }>>(
          `SELECT starts_on, ends_on FROM events ORDER BY id ASC LIMIT 1`
        ),
        getPortalApplicationSchedule(query),
        anyDrawCompleted(query),
        getResultsBannerSettings(query)
      ])
    )

  const availableCountByCategory = new Map(availableCounts.map(row => [row.category_id, Number(row.available_count)]))

  // Shared-slot "(A)"/"(B)" badge numbering applies ONLY to Refreshment and
  // Sweets/Bakers — the two categories sharing the same stall type at
  // Brahma Sarovar — never to whichever category happens to land in
  // display position 2/3 (previously purely positional, which mislabeled
  // Artisan Card Holders "2(A)" once display_order put it there; confirmed
  // live, 2026-11-27). Every other category gets a plain sequential number.
  // Also only applies when BOTH of the pair are actually showing on the
  // homepage (e.g. both open for applications) — if only one of them is
  // listed, it gets a plain number too, not a lone "(A)" with no "(B)".
  const SHARED_SLOT_SLUGS_ALL = new Set(['refreshment-stalls', 'sweets-special-items'])
  const presentSharedSlugs = rawCategories.filter(c => SHARED_SLOT_SLUGS_ALL.has(c.slug)).map(c => c.slug)
  const SHARED_SLOT_SLUGS = presentSharedSlugs.length === 2 ? SHARED_SLOT_SLUGS_ALL : new Set<string>()

  const badgeLabels = rawCategories.reduce<{ labels: string[]; seq: number; sharedSlot: number | null }>(
    (acc, category) => {
      if (SHARED_SLOT_SLUGS.has(category.slug)) {
        // Both categories in the pair get the same number — whichever of
        // the two appears FIRST in display order is the one that "spends"
        // the next sequence number; the other just reuses it.
        const slot = acc.sharedSlot ?? acc.seq + 1

        return {
          labels: [...acc.labels, `${slot}(${category.slug === 'refreshment-stalls' ? 'A' : 'B'})`],
          seq: acc.sharedSlot === null ? slot : acc.seq,
          sharedSlot: slot
        }
      }

      const next = acc.seq + 1

      return { labels: [...acc.labels, String(next)], seq: next, sharedSlot: acc.sharedSlot }
    },
    { labels: [], seq: 0, sharedSlot: null }
  ).labels

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
      badgeLabel: badgeLabels[index],
      feePaise: fee?.totalPaise ?? null,
      feeBasePaise: fee?.basePaise ?? null,
      gstPercent: fee?.gstPercent ?? null,
      allotmentAmountPaise: category.allotment_amount_paise,
      allotmentAmountNote: category.allotment_amount_note,
      allotmentAmountNoteHi: category.allotment_amount_note_hi,
      availableShopsCount: availableCountByCategory.get(category.id) ?? 0,

      // parseIstDateTime (not a bare `new Date(...)`) — the raw DB string is
      // IST wall-clock time; parsing it with a plain `new Date()` reads it
      // in the server process's own timezone instead, which silently breaks
      // this on a UTC-timezone host. Must stay consistent with
      // isCategoryAcceptingApplications in this same file.
      isApplicationClosed: Boolean(
        category.application_closes_at && parseIstDateTime(category.application_closes_at) < new Date()
      ),
      externalApplyUrl: category.external_apply_url,
      pdfPath: category.pdf_path,
      totalBooths: category.total_booths,
      lastDate: category.last_date
    }
  })

  const event = eventRows[0] ?? { starts_on: null, ends_on: null }

  cachedHomeData = {
    categories,
    eventStartsOn: event.starts_on,
    eventEndsOn: event.ends_on,
    applicationOpensAt: schedule.applicationOpensAt,
    applicationClosesAt: schedule.applicationClosesAt,
    resultsDeclared,
    resultsBannerTextEn: bannerSettings.textEn,
    resultsBannerTextHi: bannerSettings.textHi
  }
  homeDataCachedAt = now

  return (
    <>
      <ResultsDeclaredBanner show={resultsDeclared} textEn={bannerSettings.textEn} textHi={bannerSettings.textHi} />
      <PublicHomeClient
        categories={categories}
        eventStartsOn={event.starts_on}
        eventEndsOn={event.ends_on}
        applicationOpensAt={schedule.applicationOpensAt}
        applicationClosesAt={schedule.applicationClosesAt}
      />
    </>
  )
}

export default PublicHome
