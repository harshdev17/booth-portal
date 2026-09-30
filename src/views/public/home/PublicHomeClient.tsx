'use client'

import Image from 'next/image'

import CategoryCard, { type CategoryCardData } from '@/components/public/CategoryCard'
import ContactBannerSection from '@/components/public/ContactBannerSection'
import FaqSection from '@/components/public/FaqSection'
import HeroSlider from '@/components/public/HeroSlider'
import HowItWorks from '@/components/public/HowItWorks'
import ImportantNoticeSection from '@/components/public/ImportantNoticeSection'
import ReservedCategoriesSection from '@/components/public/ReservedCategoriesSection'
import StatusCheckSection from '@/components/public/StatusCheckSection'
import WhyParticipateSection from '@/components/public/WhyParticipateSection'
import { useLanguage } from '@/context/LanguageContext'

interface PublicHomeClientProps {
  categories: CategoryCardData[]
  eventStartsOn: string | null
  eventEndsOn: string | null
}

export default function PublicHomeClient({ categories, eventStartsOn, eventEndsOn }: PublicHomeClientProps) {
  const { t } = useLanguage()

  return (
    <>
      <HeroSlider eventStartsOn={eventStartsOn} eventEndsOn={eventEndsOn} />

      {/* Important Note (Application Fee / Non-Refundable / Allotment Process) */}
      <ImportantNoticeSection />

      {/* Categories Section with Background Image */}
      <section id='categories' className='relative px-4 py-20 sm:px-6 overflow-hidden bg-[#faf8f5]'>
        {/* Full-width composite background image */}
        <div className='absolute inset-0 pointer-events-none'>
          <Image
            src='/images/public/ChatGPT Image Sep 27, 2026, 01_52_37 PM.png'
            alt='Gita Mahotsav Brahma Sarovar Background'
            fill
            className='object-cover object-top opacity-35'
            priority
          />
          {/* Subtle gradient wash to maintain 100% card legibility */}
          <div className='absolute inset-0 bg-gradient-to-b from-[#faf8f5]/80 via-[#faf8f5]/65 to-[#faf8f5]/90' />
        </div>

        <div className='relative z-10 mx-auto max-w-7xl'>
          {/* Ornamental Section Header matching reference image */}
          <div className='mb-12 text-left'>
            <div className='mb-3 inline-flex items-center gap-3'>
              <span className='text-xs font-black tracking-widest text-[#d8891d] uppercase shrink-0'>
                {t('categories.badge')}
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
              {t('categories.heading')}
            </h2>
            <p className='max-w-2xl text-base sm:text-lg text-[#4b5d73]'>
              {t('categories.desc')}
            </p>
          </div>

          {categories.length === 0 ? (
            <p className='border border-[var(--kdb-border)] bg-white/90 p-8 text-center text-[var(--kdb-muted)] rounded-2xl shadow-xs'>
              {t('categories.empty')}
            </p>
          ) : (
            <div className='grid gap-4.5 sm:grid-cols-2 lg:grid-cols-3'>
              {categories.map(category => (
                <CategoryCard key={category.slug} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Dedicated Application Status Check Section (Matching Reference Design) */}
      <StatusCheckSection />

      {/* Why Participate? */}
      <WhyParticipateSection />

      {/* Reserved Categories */}
      <ReservedCategoriesSection />

      {/* How It Works Section */}
      <section id='how-it-works' className='px-4 py-20 sm:px-6 border-t border-[#ede5db]/60 bg-[#faf8f5]'>
        <div className='mx-auto max-w-7xl'>
          {/* Ornamental Section Header matching the portal theme */}
          <div className='mb-14 text-left'>
            <div className='mb-3 inline-flex items-center gap-3'>
              <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
                {t('how.badge')}
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
              {t('how.heading')}
            </h2>
            <p className='max-w-2xl text-base sm:text-lg text-[#4b5d73]'>
              {t('how.desc')}
            </p>
          </div>

          <HowItWorks />
        </div>
      </section>

      {/* Contact & Helpdesk Banner Section (Positioned directly above FAQ) */}
      <ContactBannerSection />

      {/* Frequently Asked Questions (FAQ) Section */}
      <FaqSection />
    </>
  )
}
