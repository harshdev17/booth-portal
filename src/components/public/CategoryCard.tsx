import Image from 'next/image'
import Link from 'next/link'

import { useLanguage } from '@/context/LanguageContext'

export type CategoryCardData = {
  slug: string
  name: string
  nameHi: string | null
  description: string | null
  selectionMethod: 'draw' | 'manual' | 'auction' | 'tender' | 'application_fee'
  displayIndex: number
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  'ngos-social-organizations': '/images/public/gita-mahotsav-category-icons/01-ngos-social-organizations.svg',
  'refreshment-stalls': '/images/public/gita-mahotsav-category-icons/02-food-stalls.svg',
  'self-help-groups': '/images/public/gita-mahotsav-category-icons/03-shg.svg',
  'artisan-card-holders': '/images/public/gita-mahotsav-category-icons/04-artisan-card-holders.svg',
  'national-awardees': '/images/public/gita-mahotsav-category-icons/05-national-awardees.svg',
  'special-art-craft': '/images/public/gita-mahotsav-category-icons/06-special-art-craft.svg',
  'wooden-craft-carpets': '/images/public/gita-mahotsav-category-icons/07-wood-craft-carpets.svg',
  'govt-departments': '/images/public/gita-mahotsav-category-icons/08-government-departments.svg',
  'khadi-other-reserved': '/images/public/gita-mahotsav-category-icons/09-reserved-categories.svg',
  'brand-promotions': '/images/public/gita-mahotsav-category-icons/10-brand-promotions-corporate.svg'
}

const CategoryCard = ({ category }: { category: CategoryCardData }) => {
  const { lang, t } = useLanguage()

  const iconSrc =
    CATEGORY_ICON_MAP[category.slug] ||
    `/images/public/gita-mahotsav-category-icons/${String(category.displayIndex).padStart(2, '0')}-*.svg` ||
    '/images/public/gita-mahotsav-category-icons/01-ngos-social-organizations.svg'

  // Respect active language: if 'hi', show Hindi name; if 'en', show English name
  const title = lang === 'hi' ? (category.nameHi || category.name) : category.name

  return (
    <div className='group relative flex h-full flex-col rounded-2xl border border-[#ebe4db] bg-white/95 p-5 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--kdb-primary)]/40 hover:shadow-xl backdrop-blur-xs'>
      {/* Top Icon with Light Golden Ring */}
      <div className='mb-4 flex size-12 items-center justify-center rounded-full border border-[#f5d9ad] bg-[#fffaf1] p-2.5 text-[#0d3b66] shadow-2xs transition duration-300 group-hover:scale-105 group-hover:border-[#e5a842]'>
        <Image
          src={iconSrc}
          alt={title}
          width={28}
          height={28}
          className='size-7 object-contain'
        />
      </div>

      {/* Main Title based on selected language */}
      <h3 className='mb-3 text-base font-black leading-snug text-[#072448] group-hover:text-[var(--kdb-primary)] transition-colors min-h-[44px] flex items-center'>
        {title}
      </h3>

      {/* Description */}
      {category.description && (
        <p className='mb-5 line-clamp-3 text-xs leading-relaxed text-[#556980]'>
          {lang === 'hi' && category.nameHi
            ? category.description
            : category.description}
        </p>
      )}

      {/* Action Buttons: Dark Blue Solid Apply + Outlined View Details */}
      <div className='mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-[#f0eae1]'>
        <Link
          href={`/apply/${category.slug}`}
          className='flex items-center justify-center gap-1 rounded-xl bg-[#092b52] px-2.5 py-2 text-center text-xs font-bold text-white shadow-2xs transition hover:bg-[#061e3a] active:scale-[0.98]'
        >
          <span>{lang === 'hi' ? 'आवेदन करें' : 'Apply Now'}</span>
          <span className='text-[11px] font-black'>→</span>
        </Link>
        <Link
          href={`/categories/${category.slug}`}
          className='flex items-center justify-center rounded-xl border border-[#d6dfe6] bg-white px-2 py-2 text-center text-xs font-bold text-[#092b52] transition hover:bg-[#f5f8fb] hover:border-[#b4c5d5] active:scale-[0.98]'
        >
          <span>{lang === 'hi' ? 'विवरण देखें' : 'View Details'}</span>
        </Link>
      </div>
    </div>
  )
}

export default CategoryCard
