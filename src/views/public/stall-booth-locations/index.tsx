'use client'

import Link from 'next/link'

import { MapIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'
import type { CategoryMapRow } from '@/lib/settings/category-maps'

/**
 * Stall/Booth Locations page — a "Full Map" PDF plus one optional
 * category-wise map PDF per open category. Both come from the
 * admin-uploadable `category_maps` table (migration 0047), not hardcoded
 * paths, so an admin can replace any of these PDFs from
 * /admin/settings/maps without a code change. A category with no uploaded
 * map simply doesn't appear in the list — nothing invented.
 */
const StallBoothLocationsView = ({
  fullMap,
  categoryMaps
}: {
  fullMap: CategoryMapRow | null
  categoryMaps: CategoryMapRow[]
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

      {fullMap && (
        <a
          href={fullMap.pdfPath}
          target='_blank'
          rel='noopener noreferrer'
          className='mb-8 inline-flex items-center gap-2 rounded-xl bg-[var(--kdb-secondary)] px-6 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#a96d0e]'
        >
          <MapIcon className='size-5' />
          {lang === 'hi' ? 'पूरा मानचित्र देखें' : 'View Full Map'}
        </a>
      )}

      {categoryMaps.length > 0 && (
        <div className='rounded-xl border border-[var(--kdb-border)]'>
          <h2 className='border-b border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] px-5 py-3 text-base font-bold text-[var(--kdb-primary)] sm:text-lg'>
            {lang === 'hi' ? 'श्रेणी अनुसार मानचित्र' : 'Category-wise Maps'}
          </h2>
          <ul className='divide-y divide-[var(--kdb-border)]'>
            {categoryMaps.map(row => (
              <li key={row.categoryId} className='flex items-center justify-between gap-4 px-5 py-4'>
                <span className='font-semibold text-[var(--kdb-text)]'>
                  {lang === 'hi' && row.categoryNameHi ? row.categoryNameHi : row.categoryName}
                </span>
                <a
                  href={row.pdfPath}
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

      <Link
        href='/'
        className='mt-8 inline-block rounded-lg border border-[var(--kdb-border)] bg-white px-8 py-3.5 text-base font-bold text-[var(--kdb-primary)] hover:bg-[var(--kdb-light-bg)]'
      >
        {lang === 'hi' ? '← मुख्य पृष्ठ पर वापस जाएं' : '← Back to Home'}
      </Link>
    </div>
  )
}

export default StallBoothLocationsView
