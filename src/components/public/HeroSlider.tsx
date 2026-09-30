'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const SLIDE_IMAGES = ['/images/public/hero-slider/1.png', '/images/public/hero-slider/2.png', '/images/public/hero-slider/3.png']
const AUTOPLAY_MS = 6000

function formatEventDate(value: string | null, lang: 'hi' | 'en'): string | null {
  if (!value) return null

  return new Date(value).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Hero image carousel — same bilingual text content on every slide (per
 * explicit instruction), only the background image cycles. Event-wide
 * application dates (eventStartsOn/eventEndsOn, from events.starts_on/
 * ends_on — distinct from any single category's own open/close dates) are
 * shown when configured; "to be announced" otherwise, since the source
 * content's "From __________ to __________" was a literal placeholder, not
 * real dates to hardcode.
 */
const HeroSlider = ({ eventStartsOn, eventEndsOn }: { eventStartsOn: string | null; eventEndsOn: string | null }) => {
  const { lang } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % SLIDE_IMAGES.length)
    }, AUTOPLAY_MS)

    return () => clearInterval(interval)
  }, [])

  const goTo = (index: number) => setActiveIndex((index + SLIDE_IMAGES.length) % SLIDE_IMAGES.length)

  const startsOnText = formatEventDate(eventStartsOn, lang)
  const endsOnText = formatEventDate(eventEndsOn, lang)

  const dateRangeText =
    startsOnText && endsOnText
      ? lang === 'hi'
        ? `${startsOnText} से ${endsOnText} तक`
        : `From ${startsOnText} to ${endsOnText}`
      : lang === 'hi'
        ? 'तिथियाँ शीघ्र घोषित की जाएंगी'
        : 'Dates to be announced'

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
            <Image src={src} alt='' fill priority={index === 0} className='object-cover' />
            <div className='absolute inset-0 bg-gradient-to-r from-[#0c2847]/80 via-[#0c2847]/35 to-transparent sm:via-[#0c2847]/25' />
            <div className='absolute inset-0 bg-gradient-to-t from-[#0c2847]/50 via-transparent to-transparent' />
          </div>
        ))}

        {/* Content overlay — identical on every slide */}
        <div className='relative z-10 mx-auto flex min-h-[460px] sm:min-h-[520px] lg:min-h-[600px] max-w-7xl items-center px-6 py-16 sm:px-10 lg:px-12'>
          <div className='max-w-2xl text-white'>
            <div className='mb-4 inline-flex items-center gap-2 rounded-full bg-[#d8891d] px-4 py-1.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-sm'>
              {lang === 'hi' ? 'आवेदन अभी खुले हैं' : 'Applications Now Open'}
            </div>

            <p className='mb-2 text-base font-extrabold tracking-[0.2em] text-[#f0af3d] uppercase'>IGM 2026</p>

            <h1 className='mb-4 text-3xl leading-tight font-black sm:text-4xl lg:text-5xl'>
              {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Gita Jayanti Mahotsav 2026'}
            </h1>

            <p className='mb-6 max-w-xl text-base leading-relaxed text-slate-100 sm:text-lg'>
              {lang === 'hi'
                ? 'स्टॉल / दुकान / बूथ हेतु ऑनलाइन आवेदन आमंत्रित हैं।'
                : 'Online applications are invited for stalls, shops, and booths.'}
            </p>

            <p className='mb-8 text-sm font-semibold text-[#f0af3d] sm:text-base'>{dateRangeText}</p>

            <div className='flex flex-wrap items-center gap-3.5'>
              <Link
                href='#categories'
                className='inline-flex items-center gap-2 rounded-xl bg-[#f0af3d] px-6 py-3.5 text-sm font-bold text-[#1f2937] shadow-sm transition hover:bg-[#e49f2b] active:scale-[0.98]'
              >
                <span>{lang === 'hi' ? 'स्टॉल देखें और आवेदन करें' : 'Explore Stalls & Apply'}</span>
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
