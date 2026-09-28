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
    { label: lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड (KDB)' : 'Kurukshetra Development Board', href: 'https://kdb.org.in' },
    { label: lang === 'hi' ? 'हरियाणा पर्यटन निगम' : 'Haryana Tourism Corporation', href: 'https://haryanatourism.gov.in' },
    { label: lang === 'hi' ? 'हरियाणा सरकार आधिकारिक पोर्टल' : 'Official Portal of Haryana Govt', href: 'https://haryana.gov.in' },
    { label: lang === 'hi' ? 'डिजिटल इंडिया पहल' : 'Digital India Initiative', href: 'https://digitalindia.gov.in' }
  ]

  return (
    <footer className='relative overflow-hidden bg-[#071f3a] text-white pt-14 pb-8 border-t-2 border-[#d8891d]/60'>
      {/* Subtle top heritage decorative strip */}
      <div className='absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#d8891d] via-[#fbd38d] to-[#d8891d]' />

      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Main 4-Column Grid */}
        <div className='grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 pb-12 border-b border-white/10'>
          {/* Column 1: Board Identity & Motto (4 cols) */}
          <div className='lg:col-span-4 space-y-4'>
            <div className='flex items-center gap-3.5'>
              <div className='relative size-12 shrink-0 rounded-full bg-white/10 p-1.5 backdrop-blur-xs border border-white/15'>
                <Image
                  src='/images/public/logo.png'
                  alt='Kurukshetra Development Board'
                  fill
                  className='object-contain p-1'
                />
              </div>
              <div>
                <h3 className='text-sm sm:text-base font-black tracking-tight text-white uppercase leading-snug'>
                  {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026' : 'International Gita Mahotsav 2026'}
                </h3>
                <p className='text-xs font-semibold text-[#fbd38d] tracking-wide'>
                  {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड (KDB)' : 'Kurukshetra Development Board'}
                </p>
                <p className='text-[11px] text-white/60'>
                  {lang === 'hi' ? 'हरियाणा सरकार का उपक्रम' : 'Govt. of Haryana Undertaking'}
                </p>
              </div>
            </div>

            <p className='text-xs sm:text-sm text-white/70 leading-relaxed max-w-sm'>
              {lang === 'hi'
                ? 'ब्रह्मसरोवर के पावन तट पर आयोजित होने वाले अंतर्राष्ट्रीय गीता महोत्सव में स्टॉल व दुकानों के पारदर्शी एवं निष्पक्ष आवंटन हेतु आधिकारिक डिजिटल पोर्टल।'
                : 'Official digital single-window portal for the transparent, fair, and computerized allotment of commercial stalls at Brahma Sarovar, Kurukshetra.'}
            </p>
          </div>

          {/* Column 2: Quick Links (3 cols) */}
          <div className='lg:col-span-3 space-y-3.5'>
            <h4 className='text-xs font-extrabold tracking-widest text-[#fbd38d] uppercase flex items-center gap-2'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'त्वरित पोर्टल लिंक' : 'Quick Navigation'}</span>
            </h4>
            <ul className='space-y-2.5 text-xs sm:text-sm'>
              {quickLinks.map(link => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className='text-white/75 hover:text-[#ffd56b] transition flex items-center gap-1.5 group'
                  >
                    <span className='text-[#d8891d] group-hover:translate-x-0.5 transition-transform'>›</span>
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Related Official Portals (3 cols) */}
          <div className='lg:col-span-3 space-y-3.5'>
            <h4 className='text-xs font-extrabold tracking-widest text-[#fbd38d] uppercase flex items-center gap-2'>
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
                    className='text-white/75 hover:text-[#ffd56b] transition inline-flex items-center gap-1.5 group'
                  >
                    <span>{link.label}</span>
                    <ExternalLinkIcon className='size-3 text-white/40 group-hover:text-[#ffd56b]' />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Helpdesk & Social (2 cols) */}
          <div className='lg:col-span-2 space-y-3.5'>
            <h4 className='text-xs font-extrabold tracking-widest text-[#fbd38d] uppercase flex items-center gap-2'>
              <span className='inline-block h-1 w-3 bg-[#d8891d]' />
              <span>{lang === 'hi' ? 'हेल्पडेस्क' : 'Helpdesk'}</span>
            </h4>
            <div className='space-y-2 text-xs text-white/80'>
              <div className='flex items-start gap-2'>
                <PhoneIcon className='size-3.5 shrink-0 text-[#fbd38d] mt-0.5' />
                <a href='tel:+919876543210' className='hover:text-white font-bold'>
                  +91 98765 43210
                </a>
              </div>
              <div className='flex items-start gap-2'>
                <MailIcon className='size-3.5 shrink-0 text-[#fbd38d] mt-0.5' />
                <a href='mailto:helpdesk@stallportal.in' className='hover:text-white break-all'>
                  helpdesk@stallportal.in
                </a>
              </div>
              <div className='flex items-start gap-2 pt-1'>
                <MapPinIcon className='size-3.5 shrink-0 text-[#fbd38d] mt-0.5' />
                <span className='text-[11px] text-white/70 leading-relaxed'>
                  {lang === 'hi' ? 'कुरुक्षेत्र, हरियाणा – 136118' : 'Kurukshetra, Haryana – 136118'}
                </span>
              </div>
            </div>

            {/* Social Icons */}
            <div className='pt-2'>
              <p className='text-[11px] font-bold text-white/60 mb-2 uppercase tracking-wider'>
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
                      className='flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/75 hover:bg-[#d8891d] hover:text-[#071f3a] hover:border-[#d8891d] transition'
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
        <div className='mt-6 flex flex-col items-center justify-between gap-3 text-xs text-white/55 sm:flex-row'>
          <div>
            <span>© 2026 {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड (KDB)' : 'Kurukshetra Development Board'}. </span>
            <span>{lang === 'hi' ? 'सर्वाधिकार सुरक्षित।' : 'All Rights Reserved.'}</span>
          </div>
          <div className='flex items-center gap-4 text-[11px] text-white/50'>
            <Link href='#' className='hover:text-white/80 transition'>
              {lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
            </Link>
            <span>•</span>
            <Link href='#' className='hover:text-white/80 transition'>
              {lang === 'hi' ? 'नियम एवं शर्तें' : 'Terms & Conditions'}
            </Link>
            <span>•</span>
            <Link href='#' className='hover:text-white/80 transition'>
              {lang === 'hi' ? 'हाइपरलिंकिंग नीति' : 'Hyperlinking Policy'}
            </Link>
          </div>
        </div>

        {/* Developer Attribution */}
        <div className='mt-3 pt-3 border-t border-white/10 text-center text-[11px] text-white/45'>
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
