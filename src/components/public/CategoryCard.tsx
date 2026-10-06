import Link from 'next/link'

import {
  ArmchairIcon,
  HeartHandshakeIcon,
  LandmarkIcon,
  MegaphoneIcon,
  PaletteIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StoreIcon,
  TrophyIcon,
  UsersIcon,
  UtensilsCrossedIcon,
  type LucideIcon
} from 'lucide-react'

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

// Solid coloured circle + white glyph per category, matching the home-page
// reference design. `color` also tints the index badge.
const CATEGORY_ICON_MAP: Record<string, { Icon: LucideIcon; color: string }> = {
  'ngos-social-organizations': { Icon: UsersIcon, color: 'bg-green-600' },
  'refreshment-stalls': { Icon: UtensilsCrossedIcon, color: 'bg-blue-600' },
  'self-help-groups': { Icon: HeartHandshakeIcon, color: 'bg-pink-600' },
  'artisan-card-holders': { Icon: PaletteIcon, color: 'bg-orange-600' },
  'national-awardees': { Icon: TrophyIcon, color: 'bg-purple-600' },
  'special-art-craft': { Icon: SparklesIcon, color: 'bg-amber-600' },
  'wooden-craft-carpets': { Icon: ArmchairIcon, color: 'bg-yellow-700' },
  'govt-departments': { Icon: LandmarkIcon, color: 'bg-slate-700' },
  'khadi-other-reserved': { Icon: ShoppingBagIcon, color: 'bg-red-600' },
  'brand-promotions': { Icon: MegaphoneIcon, color: 'bg-teal-600' }
}

const DEFAULT_CATEGORY_ICON = { Icon: StoreIcon, color: 'bg-[#0d3b66]' }

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

  const { Icon, color } = CATEGORY_ICON_MAP[category.slug] ?? DEFAULT_CATEGORY_ICON

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
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-full text-white shadow-xs ring-4 ring-white transition duration-300 group-hover:scale-105 ${color}`}
        >
          <Icon className='size-7' strokeWidth={2} aria-hidden='true' />
        </div>
      </div>

      {/* Title */}
      <h3 className='mb-2 text-xl font-black leading-snug text-[#072448] transition-colors group-hover:text-[var(--kdb-primary)]'>
        {title}
      </h3>

      {/* Available shops count */}
      <div className='mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#eef6f0] px-4 py-1.5'>
        <span className='text-lg font-black text-[#1a7d42]'>{category.availableShopsCount}</span>
        <span className='text-sm font-bold text-[#1a7d42]'>
          {lang === 'hi' ? 'उपलब्ध बूथ/स्टॉल' : 'Available Booths/Stalls'}
        </span>
      </div>

      {/* Key facts */}
      <dl className='mb-4 flex flex-col gap-3 border-y border-[#f0eae1] py-4 text-sm'>
        <div>
          <dt className='text-xs font-extrabold tracking-wide text-[#b8761b] uppercase'>
            {lang === 'hi' ? 'बूथ/स्टॉल आवंटन का तरीका' : 'Allotment Method'}
          </dt>
          <dd className='text-base font-bold text-[#072448]'>{methodLabel}</dd>
        </div>
        <div>
          <dt className='text-xs font-extrabold tracking-wide text-[#b8761b] uppercase'>
            {lang === 'hi' ? 'बूथ/स्टॉल आवंटन राशि' : 'Allotment Amount'}
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
