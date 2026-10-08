'use client'

import Image from 'next/image'
import Link from 'next/link'

import { ExternalLinkIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'

import { useContactSettings } from '@/context/ContactSettingsContext'
import { useLanguage } from '@/context/LanguageContext'

// lucide-react dropped brand/logo icons (licensing) — Facebook/Instagram/
// YouTube glyphs are rendered as inline SVGs (standard official mark paths)
// instead of generic lookalike icons.
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.242 0-1.63.775-1.63 1.57v1.887h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94Z' />
  </svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className={className} aria-hidden='true'>
    <rect x='3' y='3' width='18' height='18' rx='5' />
    <circle cx='12' cy='12' r='4' />
    <circle cx='17.5' cy='6.5' r='1' fill='currentColor' stroke='none' />
  </svg>
)

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M21.58 7.19a2.76 2.76 0 0 0-1.94-1.95C17.9 4.75 12 4.75 12 4.75s-5.9 0-7.64.49a2.76 2.76 0 0 0-1.94 1.95A28.9 28.9 0 0 0 2 12a28.9 28.9 0 0 0 .42 4.81 2.76 2.76 0 0 0 1.94 1.95c1.74.49 7.64.49 7.64.49s5.9 0 7.64-.49a2.76 2.76 0 0 0 1.94-1.95A28.9 28.9 0 0 0 22 12a28.9 28.9 0 0 0-.42-4.81ZM9.98 15.02V8.98L15.5 12l-5.52 3.02Z' />
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className} aria-hidden='true'>
    <path d='M18.24 2.25h3.3l-7.2 8.23 8.47 11.27h-6.63l-5.2-6.8-5.94 6.8H1.73l7.7-8.8L1.3 2.25h6.8l4.7 6.22ZM17.04 19.8h1.83L7.04 4.1H5.08Z' />
  </svg>
)

const PublicFooter = () => {
  const { lang } = useLanguage()
  const { phone, email, address, addressHi, facebookUrl, instagramUrl, youtubeUrl, twitterUrl } = useContactSettings()

  const socialLinks = [
    { href: facebookUrl, icon: FacebookIcon, label: 'Facebook' },
    { href: instagramUrl, icon: InstagramIcon, label: 'Instagram' },
    { href: youtubeUrl, icon: YoutubeIcon, label: 'YouTube' },
    { href: twitterUrl, icon: XIcon, label: 'X (Twitter)' }
  ].filter((item): item is { href: string; icon: typeof FacebookIcon; label: string } => !!item.href)

  const quickLinks = [
    { label: lang === 'hi' ? 'मुख्य पृष्ठ' : 'Home', href: '/' },
    { label: lang === 'hi' ? 'स्टॉल श्रेणियां' : 'Stall Categories', href: '/#categories' },
    { label: lang === 'hi' ? 'आवेदन की स्थिति' : 'Track Application Status', href: '/#status-check' },
    { label: lang === 'hi' ? 'आवंटन प्रक्रिया' : 'Allotment Procedure', href: '/#how-it-works' },
    { label: lang === 'hi' ? 'सामान्य प्रश्न' : 'Frequently Asked Questions', href: '/#faq' }
  ]

  const relatedPortals = [
    {
      label: lang === 'hi' ? 'अंतर्राष्ट्रीय गीता महोत्सव' : 'International Gita Mahotsav',
      href: 'https://internationalgitamahotsav.in/'
    },
    {
      label: lang === 'hi' ? '48 कोस कुरुक्षेत्र' : '48 Kos Kurukshetra',
      href: 'https://48koskurukshetra.com/'
    },
    {
      label: lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड' : 'Kurukshetra Development Board',
      href: 'https://kdb.org.in'
    }

    // Hidden for now (re-add to show): Haryana Tourism Corporation (https://haryanatourism.gov.in),
    // Official Portal of Haryana Govt (https://haryana.gov.in), Digital India Initiative (https://digitalindia.gov.in).
  ]

  return (
    <footer className='relative overflow-hidden border-t-2 border-[#d8891d]/60 bg-[#071f3a] pt-14 pb-8 text-white print:hidden'>
      {/* Subtle top heritage decorative strip */}
      <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#d8891d] via-[#fbd38d] to-[#d8891d]' />

      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Main 4-Column Grid */}
        <div className='grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-12'>
          {/* Column 1: Board Identity & Motto (4 cols) */}
          <div className='space-y-4 lg:col-span-4'>
            <div className='flex items-center gap-3.5'>
              <div className='relative size-12 shrink-0 rounded-full border border-white/15 bg-white/10 p-1.5 backdrop-blur-xs'>
                <Image
                  src='/images/public/logo.webp'
                  alt='Kurukshetra Development Board'
                  fill
                  className='object-contain p-1'
                />
              </div>
              <div>
                <h3 className='text-lg leading-snug font-black tracking-tight text-white uppercase sm:text-xl'>
                  {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}
                </h3>
                <p className='text-sm font-semibold tracking-wide text-[#fbd38d] sm:text-base'>
                  {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड' : 'Kurukshetra Development Board'}
                </p>
                <p className='text-xs text-white/60 sm:text-sm'>
                  {lang === 'hi' ? 'हरियाणा सरकार का उपक्रम' : 'Govt. of Haryana Undertaking'}
                </p>
              </div>
            </div>

            <p className='max-w-sm text-sm leading-relaxed text-white/70 sm:text-base'>
              {lang === 'hi'
                ? 'ब्रह्मसरोवर के पावन तट पर आयोजित होने वाले अंतर्राष्ट्रीय गीता जयंती महोत्सव में बूथ/स्टॉल के पारदर्शी एवं निष्पक्ष आवंटन हेतु आधिकारिक डिजिटल पोर्टल।'
                : 'Official digital single-window portal for the transparent, fair, and computerized allotment of commercial stalls at Brahma Sarovar, Kurukshetra.'}
            </p>
          </div>

          {/* Column 2: Quick Links (3 cols) */}
          <div className='space-y-3.5 lg:col-span-3'>
            <h4 className='flex items-center gap-2 text-sm font-extrabold tracking-widest text-[#fbd38d] uppercase sm:text-base'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'त्वरित पोर्टल लिंक' : 'Quick Navigation'}</span>
            </h4>
            <ul className='space-y-2.5 text-sm sm:text-base'>
              {quickLinks.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className='group flex items-center gap-1.5 text-white/75 transition hover:text-[#ffd56b]'
                  >
                    <span className='text-[#d8891d] transition-transform group-hover:translate-x-0.5'>›</span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Related Official Portals (3 cols) */}
          <div className='space-y-3.5 lg:col-span-3'>
            <h4 className='flex items-center gap-2 text-sm font-extrabold tracking-widest text-[#fbd38d] uppercase sm:text-base'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'महत्वपूर्ण लिंक' : 'Important Links'}</span>
            </h4>
            <ul className='space-y-2.5 text-sm sm:text-base'>
              {relatedPortals.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group inline-flex items-center gap-1.5 text-white/75 transition hover:text-[#ffd56b]'
                  >
                    <span>{link.label}</span>
                    <ExternalLinkIcon className='size-3.5 text-white/40 group-hover:text-[#ffd56b]' />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Helpdesk & Social (2 cols) */}
          <div className='space-y-3.5 lg:col-span-2'>
            <h4 className='flex items-center gap-2 text-sm font-extrabold tracking-widest text-[#fbd38d] uppercase sm:text-base'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'हेल्पडेस्क' : 'Helpdesk'}</span>
            </h4>
            <div className='space-y-2.5 text-sm text-white/80'>
              {phone && (
                <div className='flex items-start gap-2'>
                  <PhoneIcon className='mt-0.5 size-4 shrink-0 text-[#fbd38d]' />
                  <a href={`tel:${phone}`} className='text-base font-bold hover:text-white'>
                    {phone}
                  </a>
                </div>
              )}
              {email && (
                <div className='flex items-start gap-2'>
                  <MailIcon className='mt-0.5 size-4 shrink-0 text-[#fbd38d]' />
                  <a href={`mailto:${email}`} className='break-all text-sm sm:text-base hover:text-white'>
                    {email}
                  </a>
                </div>
              )}
              {(address || addressHi) && (
                <div className='flex items-start gap-2 pt-1'>
                  <MapPinIcon className='mt-0.5 size-4 shrink-0 text-[#fbd38d]' />
                  <span className='text-sm leading-relaxed text-white/70'>
                    {lang === 'hi' ? (addressHi ?? address) : (address ?? addressHi)}
                  </span>
                </div>
              )}
            </div>

            {/* Social Icons */}
            {socialLinks.length > 0 && (
              <div className='pt-2'>
                <p className='mb-2 text-xs font-bold tracking-wider text-white/60 uppercase sm:text-sm'>
                  {lang === 'hi' ? 'हमें फॉलो करें' : 'Follow Us'}
                </p>
                <div className='flex items-center gap-2.5'>
                  {socialLinks.map(item => {
                    const Icon = item.icon

                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-label={item.label}
                        className='flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/75 transition hover:border-[#d8891d] hover:bg-[#d8891d] hover:text-[#071f3a]'
                      >
                        <Icon className='size-4' />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Strip */}
        <div className='mt-6 flex flex-col items-center justify-center gap-3 text-sm text-white/55 sm:flex-row'>
          <div>
            <span>© 2026 {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड' : 'Kurukshetra Development Board'}. </span>
            <span>{lang === 'hi' ? 'सर्वाधिकार सुरक्षित।' : 'All Rights Reserved.'}</span>
          </div>
        </div>

        {/* Developer Attribution */}
        <div className='mt-3 border-t border-white/10 pt-3 text-center text-xs text-white/45'>
          <a
            href='https://waahfoundation.org/'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:text-white/70'
          >
            {lang === 'hi'
              ? 'वाह फाउंडेशन द्वारा विकसित एवं अनुरक्षित'
              : 'Developed and Maintained by WAAH Foundation'}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
