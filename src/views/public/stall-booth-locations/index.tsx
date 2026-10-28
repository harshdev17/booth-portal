'use client'

import Link from 'next/link'

import { MapIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'
import type { CategoryMapRow, CategoryWithOptionalMap } from '@/lib/settings/category-maps'

/**
 * Stall/Booth Locations page — a "Full Map" PDF plus one optional
 * category-wise map PDF per open category. Both come from the
 * admin-uploadable `category_maps` table (migration 0047), not hardcoded
 * paths, so an admin can replace any of these PDFs from
 * /admin/settings/maps without a code change.
 *
 * The Full Map button shows a "View Map - Updated Soon" placeholder instead
 * of disappearing when no Full Map is uploaded yet (per explicit request,
 * 2026-10-28). The "Category-wise Maps" section itself still only lists
 * categories that actually have a map uploaded — a category with none is
 * simply absent from that list (reverted from an earlier version of this
 * page that listed every open category with its own "Updated Soon" row per
 * category; per follow-up explicit request, that section should only show
 * up, and only list, categories once their map is actually ready).
 */
const StallBoothLocationsView = ({
  fullMap,
  categories
}: {
  fullMap: CategoryMapRow | null
  categories: CategoryWithOptionalMap[]
}) => {
  const { lang } = useLanguage()

  return (
    <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
        {lang === 'hi' ? 'स्टॉल/बूथ लोकेशन' : 'Stall/Booth Locations'}
      </h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'आयोजन स्थल पर स्टॉल/बूथ के स्थान जानने के लिए पूरा मानचित्र अथवा अपनी श्रेणी का मानचित्र देखें।'
          : 'View the full venue layout map, or the map for your specific category, to see stall/booth locations.'}
      </p>

      <div className='mb-8 flex flex-wrap items-center gap-3'>
        {fullMap ? (
          <a
            href={fullMap.pdfPath}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-xl bg-[var(--kdb-secondary)] px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#a96d0e]'
          >
            <MapIcon className='size-5' />
            {lang === 'hi' ? 'पूरा मानचित्र देखें' : 'View Full Map'}
          </a>
        ) : (
          <span className='inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--kdb-border)] px-6 py-3.5 text-base font-semibold text-[var(--kdb-muted)]'>
            <MapIcon className='size-5' />
            {lang === 'hi' ? 'मानचित्र देखें - शीघ्र उपलब्ध होगा' : 'View Map - Updated Soon'}
          </span>
        )}
        <Link
          href='/'
          className='inline-flex items-center gap-1.5 rounded-lg border border-[var(--kdb-border)] bg-white px-8 py-3.5 text-base font-bold text-[var(--kdb-primary)] hover:bg-[var(--kdb-light-bg)]'
        >
          <span aria-hidden='true'>←</span>
          {lang === 'hi' ? 'मुख्य पृष्ठ पर वापस जाएं' : 'Back to Home'}
        </Link>
      </div>

      {categories.some(row => row.pdfPath) && (
        <div className='rounded-xl border border-[var(--kdb-border)]'>
          <h2 className='border-b border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] px-5 py-3 text-base font-bold text-[var(--kdb-primary)] sm:text-lg'>
            {lang === 'hi' ? 'श्रेणी अनुसार मानचित्र' : 'Category-wise Maps'}
          </h2>
          <ul className='divide-y divide-[var(--kdb-border)]'>
            {categories
              .filter(row => row.pdfPath)
              .map(row => (
                <li key={row.categoryId} className='flex items-center justify-between gap-4 px-5 py-4'>
                  <span className='font-semibold text-[var(--kdb-text)]'>
                    {lang === 'hi' && row.categoryNameHi ? row.categoryNameHi : row.categoryName}
                  </span>
                  <a
                    href={row.pdfPath ?? undefined}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--kdb-secondary)] px-4 py-2 text-sm font-bold text-[var(--kdb-secondary)] transition hover:bg-[var(--kdb-secondary)] hover:text-white'
                  >
                    <MapIcon className='size-4' />
                    {lang === 'hi' ? 'मानचित्र' : 'Map'}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

    </div>
  )
}

export default StallBoothLocationsView
