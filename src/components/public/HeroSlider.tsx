'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const SLIDE_IMAGES = ['/images/public/hero-slider/1.png', '/images/public/hero-slider/2.png', '/images/public/hero-slider/3.png']
const AUTOPLAY_MS = 6000

/**
 * Hero image carousel — same bilingual text content on every slide (per
 * explicit instruction), only the background image cycles. The application
 * period line is now the business's own fixed wording ("14 October 2026 to
 * 28 October 2026"), not derived from events.starts_on/ends_on — kept in
 * sync with that DB row manually when the window changes, same as every
 * other piece of static copy on this page.
 */
const HeroSlider = ({ eventStartsOn, eventEndsOn }: { eventStartsOn: string | null; eventEndsOn: string | null }) => {
  // eventStartsOn/eventEndsOn are accepted (and threaded through from the DB
  // by the caller) but no longer rendered directly — see the comment above.
  void eventStartsOn
  void eventEndsOn

  const { lang } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % SLIDE_IMAGES.length)
    }, AUTOPLAY_MS)

    return () => clearInterval(interval)
  }, [])

  const goTo = (index: number) => setActiveIndex((index + SLIDE_IMAGES.length) % SLIDE_IMAGES.length)

  return (
    <section className='relative w-full overflow-hidden bg-[#0c2847]'>
      <div className='relative min-h-[460px] sm:min-h-[520px] lg:min-h-[600px]'>
        {SLIDE_IMAGES.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={index !== activeIndex}
          >
            <Image src={src} alt='' fill priority={index === 0} sizes='100vw' quality={80} className='object-cover' />
            <div className='absolute inset-0 bg-gradient-to-r from-[#0c2847]/80 via-[#0c2847]/35 to-transparent sm:via-[#0c2847]/25' />
            <div className='absolute inset-0 bg-gradient-to-t from-[#0c2847]/50 via-transparent to-transparent' />
          </div>
        ))}

        {/* Content overlay — identical on every slide */}
        <div className='relative z-10 mx-auto flex min-h-[460px] sm:min-h-[520px] lg:min-h-[600px] max-w-7xl items-center px-6 py-16 sm:px-10 lg:px-12'>
          <div className='max-w-2xl text-white'>
            <div className='mb-4 inline-flex items-center gap-2 rounded-full bg-[#d8891d] px-4 py-1.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-sm'>
              {lang === 'hi'
                ? 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 स्टॉल/बूथ के लिए ऑनलाइन आवेदन शुरू'
                : 'Online Applications Open for International Gita Jayanti Mahotsav 2026 Booth/Stall'}
            </div>

            <h1 className='mb-4 text-3xl leading-tight font-black sm:text-4xl lg:text-5xl'>
              {lang === 'hi'
                ? 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 स्टॉल/बूथ ऑनलाइन आवेदन पोर्टल'
                : 'International Gita Jayanti Mahotsav 2026 Booth/Stall Online Application Portal'}
            </h1>

            <p className='mb-6 max-w-xl text-base leading-relaxed text-slate-100 sm:text-lg'>
              {lang === 'hi'
                ? 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में स्टॉल/बूथ के लिए ऑनलाइन आवेदन शुरू हो गए हैं। सभी इच्छुक आवेदक अपनी श्रेणी की पात्रता और दिशानिर्देशों को ध्यानपूर्वक पढ़कर ऑनलाइन आवेदन कर सकते हैं।'
                : 'Online applications are now open for stalls/booths at International Gita Jayanti Mahotsav 2026. Interested applicants can apply online after checking the eligibility criteria and guidelines for their chosen category.'}
            </p>

            <p className='mb-2 inline-flex w-fit items-center gap-2 rounded-lg border border-[#f0af3d]/40 bg-[#f0af3d]/15 px-4 py-2 text-base font-extrabold tracking-wide text-[#f0af3d] shadow-sm backdrop-blur-xs sm:text-lg'>
              {lang === 'hi'
                ? 'ऑनलाइन आवेदन की अवधि: 14 अक्टूबर 2026 से 28 अक्टूबर 2026 तक (रात 11:59 बजे तक)।'
                : 'Application Period: 14 October 2026 to 28 October 2026 (until 11:59 PM).'}
            </p>

            <p className='mb-8 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base'>
              {lang === 'hi'
                ? 'आवेदन करने से पहले: अपनी श्रेणी की पात्रता, आवश्यक दस्तावेजों, आवेदन शुल्क और स्टॉल/बूथ आबंटन से संबंधित दिशानिर्देशों को अवश्य पढ़ें।'
                : 'Before Applying: Please read the guidelines for your category carefully, including eligibility criteria, required documents, application fees, and stall/booth allotment details.'}
            </p>

            <div className='flex flex-wrap items-center gap-3.5'>
              <Link
                href='#categories'
                className='inline-flex items-center gap-2 rounded-xl bg-[#f0af3d] px-6 py-3.5 text-sm font-bold text-[#1f2937] shadow-sm transition hover:bg-[#e49f2b] active:scale-[0.98]'
              >
                <span>{lang === 'hi' ? 'बूथ/स्टॉल देखें और आवेदन करें' : 'Explore Booths/Stalls & Apply'}</span>
                <span className='text-xs font-black'>→</span>
              </Link>
              <Link
                href='/status'
                className='inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-bold text-white shadow-2xs backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]'
              >
                <span>{lang === 'hi' ? 'आवेदन की स्थिति जांचें' : 'Track Application'}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Prev/Next controls */}
        <button
          type='button'
          onClick={() => goTo(activeIndex - 1)}
          aria-label={lang === 'hi' ? 'पिछली स्लाइड' : 'Previous slide'}
          className='absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30 sm:left-5'
        >
          <ChevronLeftIcon className='size-5' />
        </button>
        <button
          type='button'
          onClick={() => goTo(activeIndex + 1)}
          aria-label={lang === 'hi' ? 'अगली स्लाइड' : 'Next slide'}
          className='absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30 sm:right-5'
        >
          <ChevronRightIcon className='size-5' />
        </button>

        {/* Dot indicators */}
        <div className='absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2'>
          {SLIDE_IMAGES.map((src, index) => (
            <button
              key={src}
              type='button'
              onClick={() => goTo(index)}
              aria-label={lang === 'hi' ? `स्लाइड ${index + 1} पर जाएं` : `Go to slide ${index + 1}`}
              aria-current={index === activeIndex}
              className={`h-2 rounded-full transition-all ${index === activeIndex ? 'w-6 bg-[#f0af3d]' : 'w-2 bg-white/50 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default HeroSlider
