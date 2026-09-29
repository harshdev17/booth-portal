'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { MenuIcon } from 'lucide-react'

import HeaderMarquee from '@/components/public/HeaderMarquee'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLanguage } from '@/context/LanguageContext'

const PublicHeader = () => {
  const { lang, setLang, t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: t('nav.home'), href: '/', active: true },
    { label: t('nav.about'), href: '/#how-it-works' },
    { label: t('nav.stalls'), href: '/#categories' },
    { label: lang === 'hi' ? 'आवेदन स्थिति' : 'Application Status', href: '/#status-check' },
    { label: lang === 'hi' ? 'दिशा-निर्देश' : 'Guidelines', href: '/guidelines' },
    { label: lang === 'hi' ? 'सामान्य प्रश्न (FAQ)' : 'FAQ', href: '/#faq' },
    { label: t('nav.contact'), href: '/#contact' }
  ]

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

        {/* Center: Navigation Links (desktop) */}
        <ul className='hidden items-center gap-7 md:flex'>
          {navItems.map(item => (
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
        <div className='flex items-center gap-2 sm:gap-3'>
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
            className='hidden items-center gap-1 rounded-full bg-[#0c2847] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#06192e] active:scale-95 sm:inline-flex'
          >
            <span>{t('nav.apply_now')}</span>
            <span className='text-[11px] font-bold'>→</span>
          </Link>

          {/* Mobile menu trigger */}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='md:hidden'
            aria-label={lang === 'hi' ? 'मेनू खोलें' : 'Open menu'}
            onClick={() => setMobileMenuOpen(true)}
          >
            <MenuIcon className='size-5 text-[#0c2847]' />
          </Button>
        </div>
      </nav>
    </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side='right' className='w-4/5 sm:max-w-xs'>
          <SheetHeader>
            <SheetTitle className='text-[#0c2847]'>
              {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026' : 'International Gita Mahotsav 2026'}
            </SheetTitle>
          </SheetHeader>

          <ul className='flex flex-col gap-1 px-4'>
            {navItems.map(item => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={
                    item.active
                      ? 'block rounded-md px-3 py-2.5 text-sm font-bold text-[#0c2847]'
                      : 'block rounded-md px-3 py-2.5 text-sm font-medium text-[#4b5563] transition hover:bg-[#f1f5f9] hover:text-[var(--kdb-primary)]'
                  }
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className='mt-auto px-4 pb-4'>
            <Link
              href='/#categories'
              onClick={() => setMobileMenuOpen(false)}
              className='flex items-center justify-center gap-1 rounded-full bg-[#0c2847] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#06192e] active:scale-95'
            >
              <span>{t('nav.apply_now')}</span>
              <span className='text-xs font-bold'>→</span>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default PublicHeader
