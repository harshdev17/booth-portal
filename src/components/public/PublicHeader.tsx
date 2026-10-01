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

  // Guidelines link hidden for now — its content is not yet updated for
  // this event (explicit instruction, see .ai/CHANGELOG.md); the /guidelines
  // page itself still exists and is reachable directly, just not linked.
  const navItems = [
    { label: t('nav.home'), href: '/', active: true },
    { label: lang === 'hi' ? 'आवेदन प्रिंट करें' : 'Print Application', href: '/print-application' },
    { label: lang === 'hi' ? 'परिणाम' : 'Result', href: '/result' },
    { label: lang === 'hi' ? 'श्रेणी विवरण' : 'Category Details', href: '/#categories' },
    { label: lang === 'hi' ? 'नीलामी भुगतान' : 'Auction Payment', href: '/auction-payment' }
  ]

  return (
    <div className='sticky top-0 z-50 w-full print:hidden'>
      {/* Top Important Information Marquee Ticker */}
      <HeaderMarquee />

      {/* Main Navigation Header */}
      <header className='border-b border-[var(--kdb-border)]/60 bg-white/95 backdrop-blur-md'>
        <nav className='mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6'>
          {/* Left: Emblem + Event Name */}
          <Link href='/' className='group flex min-w-0 shrink-0 items-center gap-3'>
            <div className='flex size-11 shrink-0 items-center justify-center'>
              <Image
                src='/images/public/logo.webp'
                alt='International Geeta Jayanti Mahotsav 2026'
                width={42}
                height={42}
                priority
              />
            </div>
            <div className='hidden sm:block'>
              <div className='text-sm leading-tight font-extrabold tracking-tight text-[var(--kdb-primary)]'>
                {lang === 'hi' ? 'अंतर्राष्ट्रीय' : 'International'}
                <br />
                {lang === 'hi' ? 'गीता जयंती महोत्सव 2026' : 'Geeta Jayanti Mahotsav 2026'}
              </div>
            </div>
          </Link>

          {/* Right: Navigation Links + Language Switcher + Mobile Menu */}
          <div className='flex min-w-0 items-center gap-6'>
            <ul className='hidden items-center gap-6 lg:flex'>
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

            {/* Simple text toggle, not a filled pill — lighter visual weight than the previous segmented control */}
            <div className='flex items-center gap-1.5 text-xs font-bold' role='group' aria-label='Language switcher'>
              <button
                type='button'
                onClick={() => setLang('hi')}
                aria-pressed={lang === 'hi'}
                className={lang === 'hi' ? 'text-[#0c2847] underline underline-offset-4' : 'text-[#94a3b8] hover:text-[#0c2847]'}
              >
                हिंदी
              </button>
              <span className='text-[#cbd5e1]'>|</span>
              <button
                type='button'
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={lang === 'en' ? 'text-[#0c2847] underline underline-offset-4' : 'text-[#94a3b8] hover:text-[#0c2847]'}
              >
                English
              </button>
            </div>

            {/* Mobile menu trigger */}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='lg:hidden'
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
              {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}
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

          {/* <div className='mt-auto px-4 pb-4'>
            <Link
              href='/#categories'
              onClick={() => setMobileMenuOpen(false)}
              className='flex items-center justify-center gap-1 rounded-full bg-[#0c2847] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#06192e] active:scale-95'
            >
              <span>{t('nav.apply_now')}</span>
              <span className='text-xs font-bold'>→</span>
            </Link>
          </div> */}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default PublicHeader
