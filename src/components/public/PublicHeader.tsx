'use client'

import Image from 'next/image'
import Link from 'next/link'


import HeaderMarquee from '@/components/public/HeaderMarquee'
import { useLanguage } from '@/context/LanguageContext'

const PublicHeader = () => {
  const { lang, setLang, t } = useLanguage()

  return (
    <div className='sticky top-0 z-50 w-full'>
      {/* Top Important Information Marquee Ticker */}
      <HeaderMarquee />

      {/* Main Navigation Header */}
      <header className='border-b border-[var(--kdb-border)]/60 bg-white/95 backdrop-blur-md'>
      <nav className='mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6'>
        {/* Left: Emblem + Event Name */}
        <Link href='/' className='flex items-center gap-3 group'>
          <div className='flex size-11 shrink-0 items-center justify-center'>
            <Image src='/images/public/logo.png' alt='International Gita Mahotsav 2026' width={42} height={42} priority />
          </div>
          <div>
            <div className='text-sm leading-tight font-extrabold text-[var(--kdb-primary)] tracking-tight'>
              {lang === 'hi' ? 'अंतर्राष्ट्रीय' : 'International'}
              <br />
              {lang === 'hi' ? 'गीता महोत्सव 2026' : 'Gita Mahotsav 2026'}
            </div>
          </div>
        </Link>

        {/* Center: Navigation Links */}
        <ul className='hidden items-center gap-7 md:flex'>
          {[
            { label: t('nav.home'), href: '/', active: true },
            { label: t('nav.about'), href: '/#how-it-works' },
            { label: t('nav.stalls'), href: '/#categories' },
            { label: lang === 'hi' ? 'आवेदन स्थिति' : 'Application Status', href: '/#status-check' },
            { label: lang === 'hi' ? 'सामान्य प्रश्न (FAQ)' : 'FAQ', href: '/#faq' },
            { label: t('nav.contact'), href: '/#contact' }
          ].map(item => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={
                  item.active
                    ? 'text-sm font-bold text-[#111827]'
                    : 'text-sm font-medium text-[#4b5563] transition hover:text-[var(--kdb-primary)]'
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right: Premium Govt Style Bilingual Switcher + Status / Login */}
        <div className='flex items-center gap-3'>
          {/* Government Portal Standard Dual Segmented Language Pill */}
          <div className='inline-flex items-center rounded-full border border-[#cbd5e1] bg-[#f8fafc] p-0.5 shadow-2xs' role='group' aria-label='Language switcher'>
            <button
              type='button'
              onClick={() => setLang('hi')}
              aria-pressed={lang === 'hi'}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                lang === 'hi'
                  ? 'bg-[#0c2847] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0c2847] hover:bg-[#e2e8f0]/60'
              }`}
            >
              <span>हिंदी</span>
            </button>
            <span className='h-3 w-px bg-[#cbd5e1]' />
            <button
              type='button'
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-[#0c2847] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0c2847] hover:bg-[#e2e8f0]/60'
              }`}
            >
              <span>English</span>
            </button>
          </div>

          <Link
            href='/#categories'
            className='inline-flex items-center gap-1 rounded-full bg-[#0c2847] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06192e] active:scale-95'
          >
            <span>{t('nav.apply_now')}</span>
            <span className='text-[11px] font-bold'>→</span>
          </Link>
        </div>
      </nav>
    </header>
    </div>
  )
}

export default PublicHeader
