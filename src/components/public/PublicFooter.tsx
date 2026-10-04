'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Building2Icon,
  CameraIcon,
  ExternalLinkIcon,
  HelpCircleIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  PlaySquareIcon,
  ShieldCheckIcon,
  ThumbsUpIcon,
  XIcon
} from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const PublicFooter = () => {
  const { lang, t } = useLanguage()

  const quickLinks = [
    { label: lang === 'hi' ? 'मुख्य पृष्ठ' : 'Home', href: '/' },
    { label: lang === 'hi' ? 'स्टॉल श्रेणियां' : 'Stall Categories', href: '/#categories' },
    { label: lang === 'hi' ? 'आवेदन की स्थिति' : 'Track Application Status', href: '/#status-check' },
    { label: lang === 'hi' ? 'आवंटन प्रक्रिया (How It Works)' : 'Allotment Procedure', href: '/#how-it-works' },
    { label: lang === 'hi' ? 'सामान्य प्रश्न (FAQ)' : 'Frequently Asked Questions', href: '/#faq' }
  ]

  const relatedPortals = [
    {
      label: lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड (KDB)' : 'Kurukshetra Development Board',
      href: 'https://kdb.org.in'
    },
    {
      label: lang === 'hi' ? 'हरियाणा पर्यटन निगम' : 'Haryana Tourism Corporation',
      href: 'https://haryanatourism.gov.in'
    },
    {
      label: lang === 'hi' ? 'हरियाणा सरकार आधिकारिक पोर्टल' : 'Official Portal of Haryana Govt',
      href: 'https://haryana.gov.in'
    },
    { label: lang === 'hi' ? 'डिजिटल इंडिया पहल' : 'Digital India Initiative', href: 'https://digitalindia.gov.in' }
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
                <h3 className='text-sm leading-snug font-black tracking-tight text-white uppercase sm:text-base'>
                  {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}
                </h3>
                <p className='text-xs font-semibold tracking-wide text-[#fbd38d]'>
                  {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड (KDB)' : 'Kurukshetra Development Board'}
                </p>
                <p className='text-[11px] text-white/60'>
                  {lang === 'hi' ? 'हरियाणा सरकार का उपक्रम' : 'Govt. of Haryana Undertaking'}
                </p>
              </div>
            </div>

            <p className='max-w-sm text-xs leading-relaxed text-white/70 sm:text-sm'>
              {lang === 'hi'
                ? 'ब्रह्मसरोवर के पावन तट पर आयोजित होने वाले अंतर्राष्ट्रीय गीता जयंती महोत्सव में बूथ/स्टॉल के पारदर्शी एवं निष्पक्ष आवंटन हेतु आधिकारिक डिजिटल पोर्टल।'
                : 'Official digital single-window portal for the transparent, fair, and computerized allotment of commercial stalls at Brahma Sarovar, Kurukshetra.'}
            </p>
          </div>

          {/* Column 2: Quick Links (3 cols) */}
          <div className='space-y-3.5 lg:col-span-3'>
            <h4 className='flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#fbd38d] uppercase'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'त्वरित पोर्टल लिंक' : 'Quick Navigation'}</span>
            </h4>
            <ul className='space-y-2.5 text-xs sm:text-sm'>
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
            <h4 className='flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#fbd38d] uppercase'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'संबंधित आधिकारिक लिंक' : 'Related Portals'}</span>
            </h4>
            <ul className='space-y-2.5 text-xs sm:text-sm'>
              {relatedPortals.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='group inline-flex items-center gap-1.5 text-white/75 transition hover:text-[#ffd56b]'
                  >
                    <span>{link.label}</span>
                    <ExternalLinkIcon className='size-3 text-white/40 group-hover:text-[#ffd56b]' />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Helpdesk & Social (2 cols) */}
          <div className='space-y-3.5 lg:col-span-2'>
            <h4 className='flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#fbd38d] uppercase'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'हेल्पडेस्क' : 'Helpdesk'}</span>
            </h4>
            <div className='space-y-2 text-xs text-white/80'>
              <div className='flex items-start gap-2'>
                <PhoneIcon className='mt-0.5 size-3.5 shrink-0 text-[#fbd38d]' />
                <a href='tel:+919876543210' className='font-bold hover:text-white'>
                  +91 98765 43210
                </a>
              </div>
              <div className='flex items-start gap-2'>
                <MailIcon className='mt-0.5 size-3.5 shrink-0 text-[#fbd38d]' />
                <a href='mailto:helpdesk@stallportal.in' className='break-all hover:text-white'>
                  helpdesk@stallportal.in
                </a>
              </div>
              <div className='flex items-start gap-2 pt-1'>
                <MapPinIcon className='mt-0.5 size-3.5 shrink-0 text-[#fbd38d]' />
                <span className='text-[11px] leading-relaxed text-white/70'>
                  {lang === 'hi' ? 'कुरुक्षेत्र, हरियाणा – 136118' : 'Kurukshetra, Haryana – 136118'}
                </span>
              </div>
            </div>

            {/* Social Icons */}
            <div className='pt-2'>
              <p className='mb-2 text-[11px] font-bold tracking-wider text-white/60 uppercase'>
                {lang === 'hi' ? 'सोशल मीडिया' : 'Follow KDB'}
              </p>
              <div className='flex items-center gap-2'>
                {[
                  { icon: ThumbsUpIcon, label: 'Facebook' },
                  { icon: XIcon, label: 'X (Twitter)' },
                  { icon: CameraIcon, label: 'Instagram' },
                  { icon: PlaySquareIcon, label: 'YouTube' }
                ].map((item, idx) => {
                  const Icon = item.icon

                  return (
                    <a
                      key={idx}
                      href='#'
                      aria-label={item.label}
                      className='flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/75 transition hover:border-[#d8891d] hover:bg-[#d8891d] hover:text-[#071f3a]'
                    >
                      <Icon className='size-3.5' />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className='mt-6 flex flex-col items-center justify-center gap-3 text-xs text-white/55 sm:flex-row'>
          <div>
            <span>© 2026 {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड (KDB)' : 'Kurukshetra Development Board'}. </span>
            <span>{lang === 'hi' ? 'सर्वाधिकार सुरक्षित।' : 'All Rights Reserved.'}</span>
          </div>
        </div>

        {/* Developer Attribution */}
        <div className='mt-3 border-t border-white/10 pt-3 text-center text-[11px] text-white/45'>
          <span>
            {lang === 'hi'
              ? 'वााह फाउंडेशन द्वारा विकसित एवं अनुरक्षित'
              : 'Developed and Maintained by WAAH Foundation'}
          </span>
        </div>
      </div>
    </footer>
  )
}

export default PublicFooter
