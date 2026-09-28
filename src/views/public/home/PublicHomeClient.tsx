'use client'

import Image from 'next/image'
import Link from 'next/link'

import CategoryCard, { CategoryCardData } from '@/components/public/CategoryCard'
import ContactBannerSection from '@/components/public/ContactBannerSection'
import FaqSection from '@/components/public/FaqSection'
import HowItWorks from '@/components/public/HowItWorks'
import StatusCheckSection from '@/components/public/StatusCheckSection'
import { useLanguage } from '@/context/LanguageContext'

interface PublicHomeClientProps {
  categories: CategoryCardData[]
}

export default function PublicHomeClient({ categories }: PublicHomeClientProps) {
  const { lang, t } = useLanguage()

  return (
    <>
      {/* Design 3 - Premium Minimal Hero Section */}
      <section className='relative w-full overflow-hidden bg-[#faf8f5]'>
        {/* Full-width composite background image */}
        <div className='absolute inset-0'>
          <Image
            src='/images/public/gita-mahotsav-bg.png?v=20260927-2'
            alt='International Gita Mahotsav 2026 Kurukshetra'
            fill
            className='object-cover object-right sm:object-[80%_center] lg:object-right'
            priority
            unoptimized
          />
          {/* Subtle responsive fade on small mobile screens */}
          <div className='absolute inset-y-0 left-0 w-full sm:w-[65%] lg:w-[50%] bg-gradient-to-r from-[#faf8f5]/95 via-[#faf8f5]/80 to-transparent lg:hidden' />
        </div>

        <div className='relative mx-auto flex min-h-[460px] sm:min-h-[500px] lg:min-h-[520px] max-w-7xl items-center px-6 py-12 sm:px-10 lg:px-12'>
          {/* Left Text Column */}
          <div className='z-10 w-full max-w-xl'>
            {/* Top small label - tracking normal for Devanagari to avoid broken matras */}
            <div className='mb-3 inline-flex items-center gap-2'>
              <span className='h-2 w-2 rounded-full bg-[#d8891d] shrink-0' />
              <span className='text-xs font-bold text-[#b8761b] tracking-normal'>
                {t('hero.badge')}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className='mb-4 text-3xl leading-[1.15] font-black text-[#0f243e] sm:text-4xl lg:text-[46px]'>
              {t('hero.title_part1')} <br />
              <span className='text-[#df8d1e]'>{t('hero.title_part2')}</span>
            </h1>

            {/* Description */}
            <p className='mb-8 max-w-md text-[15px] leading-relaxed text-[#4b5563]'>
              {t('hero.desc')}
            </p>

            {/* Buttons */}
            <div className='flex flex-wrap items-center gap-3.5'>
              <Link
                href='#categories'
                className='inline-flex items-center gap-2 rounded-xl bg-[#f0af3d] px-6 py-3.5 text-sm font-bold text-[#1f2937] shadow-sm transition hover:bg-[#e49f2b] active:scale-[0.98]'
              >
                <span>{t('hero.btn_apply')}</span>
                <span className='text-xs font-black'>→</span>
              </Link>
              <Link
                href='/status'
                className='inline-flex items-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-6 py-3.5 text-sm font-bold text-[#1f2937] shadow-2xs transition hover:bg-[#f9fafb] active:scale-[0.98]'
              >
                <span>{t('hero.btn_status')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
            <div className='grid gap-4.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'>
              {categories.map(category => (
                <CategoryCard key={category.slug} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Dedicated Application Status Check Section (Matching Reference Design) */}
      <StatusCheckSection />

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
