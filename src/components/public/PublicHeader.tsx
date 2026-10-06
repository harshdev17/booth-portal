'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { MailIcon, MenuIcon, PhoneIcon } from 'lucide-react'

import HeaderMarquee from '@/components/public/HeaderMarquee'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLanguage } from '@/context/LanguageContext'

const PublicHeader = () => {
  const { lang, setLang, t } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { label: t('nav.home'), href: '/', active: true },
    { label: lang === 'hi' ? 'दिशा-निर्देश' : 'Guidelines', href: '/guidelines' },
    { label: lang === 'hi' ? 'आवेदन प्रिंट करें' : 'Print Application', href: '/print-application' },
    { label: lang === 'hi' ? 'परिणाम' : 'Result', href: '/result' },
    { label: lang === 'hi' ? 'श्रेणी विवरण' : 'Category Details', href: '/#categories' },
    { label: lang === 'hi' ? 'नीलामी भुगतान' : 'Auction Payment', href: '/auction-payment' }
  ]

  return (
    <>
      {/* Top contact bar — scrolls away normally, not part of the sticky header below.
          Same placeholder helpline/email used site-wide (ContactBannerSection.tsx,
          PublicFooter.tsx) — [TBC – Business Confirmation Required], see .ai/OPEN_QUESTIONS.md. */}
      <div
        className='hidden transition-[grid-template-rows] duration-300 ease-in-out sm:grid print:hidden'
        style={{ gridTemplateRows: scrolled ? '0fr' : '1fr' }}
      >
        <div className='overflow-hidden border-b border-[var(--kdb-border)]/40 bg-[#0c2847] text-white'>
          <div className='mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-1.5 sm:px-6'>
            <span className='text-xs font-semibold text-white/80'>
              {lang === 'hi'
                ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 आवेदन पोर्टल'
                : 'International Geeta Jayanti Mahotsav 2026 Application Portal'}
            </span>
            <div className='flex items-center gap-5'>
              <a href='tel:+919876543210' className='flex items-center gap-1.5 text-xs font-medium transition hover:text-[#f0b429]'>
                <PhoneIcon className='size-3' />
                <span>+91 98765 43210</span>
              </a>
              <a
                href='mailto:helpdesk@stallportal.in'
                className='flex items-center gap-1.5 text-xs font-medium transition hover:text-[#f0b429]'
              >
                <MailIcon className='size-3' />
                <span>helpdesk@stallportal.in</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className='sticky top-0 z-50 w-full print:hidden'>
        {/* Masthead — centered bilingual title between the emblem (left) and a
            matching-width spacer (right), so the title block sits truly
            centered rather than crowding the logo. Collapsed via a grid-rows
            transition (not max-height) so the content fades/slides smoothly
            instead of being abruptly clipped mid-transition. */}
        <div
          className='grid transition-[grid-template-rows] duration-300 ease-in-out'
          style={{ gridTemplateRows: scrolled ? '0fr' : '1fr' }}
        >
          <div className='overflow-hidden border-b border-[var(--kdb-border)]/60 bg-white'>
          <div className='mx-auto flex max-w-7xl items-center gap-5 px-4 py-4 sm:px-6'>
            <Link href='/' className='flex size-20 shrink-0 items-center justify-center sm:size-28'>
              <Image
                src='/images/public/logo.webp'
                alt='International Geeta Jayanti Mahotsav 2026'
                width={108}
                height={108}
                priority
              />
            </Link>

            <div className='min-w-0 flex-1 text-center'>
              <p className='text-xl font-black tracking-tight text-[var(--kdb-primary)] sm:text-4xl'>
                International Geeta Jayanti Mahotsav 2026
              </p>
              <p className='mt-1 text-lg font-bold text-[#6b5a1f] sm:text-2xl'>अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026</p>
              <p className='mt-1 hidden text-base font-bold text-[#0e7a4d] sm:block'>Kurukshetra Development Board</p>
            </div>

            <div className='hidden size-20 shrink-0 sm:block sm:size-28' aria-hidden='true' />
          </div>
          </div>
        </div>

        {/* Navigation bar — nav links, language switcher, Apply CTA, social icons */}
        <header className='bg-[var(--kdb-primary)]'>
          <nav className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6'>
            <ul className='hidden items-center gap-5 lg:flex'>
              {navItems.map(item => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={
                      item.active
                        ? 'text-base font-bold text-white'
                        : 'text-base font-semibold text-white/80 transition hover:text-[#f0b429]'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className='flex items-center gap-4 lg:ml-auto'>
              {/* Simple text toggle, not a filled pill — lighter visual weight than the previous segmented control */}
              <div className='flex items-center gap-1.5 text-sm font-bold' role='group' aria-label='Language switcher'>
                <button
                  type='button'
                  onClick={() => setLang('hi')}
                  aria-pressed={lang === 'hi'}
                  className={lang === 'hi' ? 'text-white underline underline-offset-4' : 'text-white/60 hover:text-white'}
                >
                  हिंदी
                </button>
                <span className='text-white/30'>|</span>
                <button
                  type='button'
                  onClick={() => setLang('en')}
                  aria-pressed={lang === 'en'}
                  className={lang === 'en' ? 'text-white underline underline-offset-4' : 'text-white/60 hover:text-white'}
                >
                  English
                </button>
              </div>

              {/* Mobile menu trigger */}
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='text-white hover:bg-white/10 hover:text-white lg:hidden'
                aria-label={lang === 'hi' ? 'मेनू खोलें' : 'Open menu'}
                onClick={() => setMobileMenuOpen(true)}
              >
                <MenuIcon className='size-5' />
              </Button>
            </div>
          </nav>
        </header>

        {/* Top Important Information Marquee Ticker */}
        <HeaderMarquee />

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
    </>
  )
}

export default PublicHeader
