import Image from 'next/image'
import Link from 'next/link'

import { useLanguage } from '@/context/LanguageContext'

export type CategoryCardData = {
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

// Selection-method display text per language — matches the terminology used
// in the authoritative per-category content the user supplied (e.g. "ड्रॉ के
// ज़रिए / कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा निर्धारित" for manual/draw
// categories, "नीलामी के ज़रिए" for auction, "प्रतिस्पर्धी निविदा" for tender).
const SELECTION_METHOD_LABEL: Record<CategoryCardData['selectionMethod'], { hi: string; en: string }> = {
  draw: { hi: 'ड्रॉ के ज़रिए', en: 'Through Draw' },
  manual: { hi: 'कुरुक्षेत्र डेवलपमेंट बोर्ड द्वारा निर्धारित', en: 'As decided by Kurukshetra Development Board' },
  auction: { hi: 'नीलामी के ज़रिए', en: 'Through Auction' },
  tender: { hi: 'प्रतिस्पर्धी निविदा के माध्यम से', en: 'Through Competitive Tender' },
  application_fee: { hi: 'आवेदन शुल्क के आधार पर', en: 'Based on Application Fee' }
}

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

const CategoryCard = ({ category }: { category: CategoryCardData }) => {
  const { lang } = useLanguage()

  const iconSrc = CATEGORY_ICON_MAP[category.slug] ?? '/images/public/gita-mahotsav-category-icons/01-ngos-social-organizations.svg'

  const title = lang === 'hi' ? (category.nameHi || category.name) : category.name
  const methodLabel = SELECTION_METHOD_LABEL[category.selectionMethod][lang === 'hi' ? 'hi' : 'en']

  const allotmentNote = lang === 'hi' ? category.allotmentAmountNoteHi ?? category.allotmentAmountNote : category.allotmentAmountNote

  const allotmentText =
    category.allotmentAmountPaise !== null
      ? category.allotmentAmountPaise === 0
        ? lang === 'hi'
          ? 'निःशुल्क स्टॉल'
          : 'Free Stall'
        : formatRupees(category.allotmentAmountPaise)
      : (allotmentNote ?? (lang === 'hi' ? 'शीघ्र घोषित की जाएगी' : 'To be announced'))

  const feeText =
    category.feePaise === null
      ? lang === 'hi'
        ? 'लागू नहीं'
        : 'Not Applicable'
      : category.feeBasePaise !== null && category.gstPercent !== null && category.gstPercent > 0
        ? `${formatRupees(category.feeBasePaise)}/- + ${category.gstPercent}% GST = ${formatRupees(category.feePaise)}/-`
        : `${formatRupees(category.feePaise)}/-`

  return (
    <div className='group relative flex h-full flex-col rounded-2xl border border-[#ebe4db] bg-white/95 p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--kdb-primary)]/40 hover:shadow-xl backdrop-blur-xs'>
      {/* Top row: icon + index */}
      <div className='mb-4 flex items-center gap-3.5'>
        <div className='flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-[#f5d9ad] bg-[#fffaf1] p-3 text-[#0d3b66] shadow-2xs transition duration-300 group-hover:scale-105 group-hover:border-[#e5a842]'>
          <Image src={iconSrc} alt={title} width={32} height={32} className='size-8 object-contain' />
        </div>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0d3b66] text-sm font-black text-white'>
          {category.displayIndex}
        </span>
      </div>

      {/* Title */}
      <h3 className='mb-2 text-xl font-black leading-snug text-[#072448] transition-colors group-hover:text-[var(--kdb-primary)]'>
        {title}
      </h3>

      {/* Available shops count */}
      <div className='mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#eef6f0] px-3 py-1'>
        <span className='text-sm font-black text-[#1a7d42]'>{category.availableShopsCount}</span>
        <span className='text-xs font-bold text-[#1a7d42]'>
          {lang === 'hi' ? 'उपलब्ध दुकानें' : 'Available Shops'}
        </span>
      </div>

      {/* Key facts */}
      <dl className='mb-4 flex flex-col gap-3 border-y border-[#f0eae1] py-4 text-sm'>
        <div>
          <dt className='text-xs font-extrabold tracking-wide text-[#b8761b] uppercase'>
            {lang === 'hi' ? 'दुकान आवंटन का तरीका' : 'Allotment Method'}
          </dt>
          <dd className='text-base font-bold text-[#072448]'>{methodLabel}</dd>
        </div>
        <div>
          <dt className='text-xs font-extrabold tracking-wide text-[#b8761b] uppercase'>
            {lang === 'hi' ? 'दुकान आवंटन राशि' : 'Allotment Amount'}
          </dt>
          <dd className='text-base font-bold text-[#072448]'>{allotmentText}</dd>
        </div>
        <div>
          <dt className='text-xs font-extrabold tracking-wide text-[#b8761b] uppercase'>
            {lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee'}
          </dt>
          <dd className='text-lg font-black text-[var(--kdb-primary)]'>{feeText}</dd>
        </div>
      </dl>

      {/* Description */}
      {category.description && (
        <p className='mb-5 line-clamp-3 text-sm leading-relaxed text-[#556980]'>
          {lang === 'hi' && category.descriptionHi ? category.descriptionHi : category.description}
        </p>
      )}

      {/* Action Buttons */}
      <div className='mt-auto grid grid-cols-2 gap-2.5 border-t border-[#f0eae1] pt-4'>
        <Link
          href={`/apply/${category.slug}`}
          className='flex items-center justify-center gap-1.5 rounded-xl bg-[#092b52] px-3 py-3 text-center text-sm font-bold text-white shadow-2xs transition hover:bg-[#061e3a] active:scale-[0.98]'
        >
          <span>{lang === 'hi' ? 'आवेदन करें' : 'Apply Now'}</span>
          <span className='text-sm font-black'>→</span>
        </Link>
        <Link
          href={`/categories/${category.slug}`}
          className='flex items-center justify-center rounded-xl border border-[#d6dfe6] bg-white px-3 py-3 text-center text-sm font-bold text-[#092b52] transition hover:border-[#b4c5d5] hover:bg-[#f5f8fb] active:scale-[0.98]'
        >
          <span>{lang === 'hi' ? 'विवरण देखें' : 'View Details'}</span>
        </Link>
      </div>
    </div>
  )
}

export default CategoryCard
