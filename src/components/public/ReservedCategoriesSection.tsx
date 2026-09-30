'use client'

import Image from 'next/image'

import { useLanguage } from '@/context/LanguageContext'

// Only categories with a confirmed shop count are shown here — per explicit
// request, drop the "To Be Announced" placeholder cards (NGOs/SHG/Government
// Departments) rather than displaying an unconfirmed count (CLAUDE.md
// Section 21, No-Assumptions Rule). This is informational display content,
// not the actual inventory ledger (.ai/INVENTORY.md) — once real shop-count
// configuration exists there, this section should read from it instead of
// this static list.
const RESERVED_CATEGORIES: Array<{ name: string; nameHi: string; totalShops: number }> = [
  { name: 'NZCC', nameHi: 'एनजेडसीसी', totalShops: 200 },
  { name: 'SARAS', nameHi: 'सरस', totalShops: 60 },
  { name: 'Khadi', nameHi: 'खादी', totalShops: 21 }
]

/**
 * "Reserved Categories" — informational display of shop quotas reserved for
 * specific organization types, per explicit request. Static content for
 * now (same pattern as HowItWorks/WhyParticipateSection), not wired to the
 * inventory module since it doesn't exist yet.
 */
const ReservedCategoriesSection = () => {
  const { lang } = useLanguage()

  return (
    <section className='px-4 py-20 sm:px-6 border-t border-[#ede5db]/60 bg-white'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-12 text-left'>
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              {lang === 'hi' ? 'आरक्षित श्रेणियां' : 'RESERVED QUOTAS'}
            </span>
            <div className='relative h-3.5 w-32 sm:w-44 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
              />
            </div>
          </div>

          <h2 className='mb-3 text-3xl sm:text-5xl font-black tracking-tight text-[#0a2c53]'>
            {lang === 'hi' ? 'आरक्षित श्रेणियां' : 'Reserved Categories'}
          </h2>
          <p className='max-w-2xl text-base sm:text-lg text-[#4b5d73]'>
            {lang === 'hi'
              ? 'निम्नलिखित संगठन प्रकारों के लिए स्टॉल आरक्षित किए गए हैं।'
              : 'Stalls reserved for the following organization types at the event.'}
          </p>
        </div>

        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {RESERVED_CATEGORIES.map(category => (
            <div
              key={category.name}
              className='rounded-2xl border border-[#e2e8f0] bg-[#faf8f5] p-6 sm:p-7 text-center shadow-2xs transition hover:shadow-xs'
            >
              <h3 className='mb-3 text-lg font-bold text-[#0c2847]'>{lang === 'hi' ? category.nameHi : category.name}</h3>
              <p className='text-sm font-semibold text-[#d8891d]'>
                {lang === 'hi' ? 'कुल दुकानें' : 'Total Shops'}: {category.totalShops}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ReservedCategoriesSection
