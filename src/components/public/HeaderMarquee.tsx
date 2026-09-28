'use client'

import { BellIcon, SparklesIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

export default function HeaderMarquee() {
  const { lang } = useLanguage()

  const notices =
    lang === 'hi'
      ? [
          'अंतर्राष्ट्रीय गीता महोत्सव 2026: व्यावसायिक स्टॉल एवं दुकानों हेतु ऑनलाइन आवेदन प्रक्रिया प्रारंभ हो चुकी है।',
          'आवेदन करने की अंतिम तिथि से पूर्व अपने आवश्यक दस्तावेज पोर्टल पर अपलोड करें।',
          'एन.जी.ओ. स्टॉल पूर्णतः निःशुल्क हैं एवं कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा निर्णय लिया जाएगा।',
          'रिफ्रेशमेंट/खान-पान स्टॉल की नीलामी KDB द्वारा प्रत्यक्ष (मैनुअल) रूप से की जाएगी।',
          'आवंटन एवं लकी ड्रॉ संबंधी आधिकारिक सूचना हेतु केवल इसी पोर्टल का संदर्भ लें।'
        ]
      : [
          'International Gita Mahotsav 2026: Online application process for commercial stalls and booths is now live.',
          'Please ensure all mandatory documents are uploaded before the closing deadline.',
          'NGO stalls are free of cost and will be decided manually by Kurukshetra Development Board (KDB).',
          'Refreshment & Food stalls will be auctioned manually by KDB.',
          'Refer exclusively to this official portal for genuine draw results and stall allotment notifications.'
        ]

  return (
    <div className='relative z-50 bg-[#092b52] text-white'>
      <div className='mx-auto flex max-w-7xl items-center px-3 py-1.5 sm:px-6'>
        {/* Left Badge */}
        <div className='flex items-center gap-1.5 shrink-0 rounded-full bg-[#c88718] px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#092b52] uppercase shadow-xs mr-3 select-none'>
          <BellIcon className='size-3 stroke-[2.5] animate-pulse' />
          <span>{lang === 'hi' ? 'महत्वपूर्ण सूचना' : 'Important Info'}</span>
        </div>

        {/* Marquee Ticker Track */}
        <div className='relative overflow-hidden w-full flex-1'>
          <div className='marquee-track flex whitespace-nowrap gap-10 hover:[animation-play-state:paused] cursor-default'>
            <div className='flex items-center gap-10 shrink-0 text-xs font-medium text-slate-100'>
              {notices.map((text, idx) => (
                <span key={`notice-1-${idx}`} className='inline-flex items-center gap-2.5'>
                  <SparklesIcon className='size-3 text-[#f0b429] shrink-0' />
                  <span>{text}</span>
                </span>
              ))}
            </div>

            {/* Duplicated for seamless continuous looping */}
            <div className='flex items-center gap-10 shrink-0 text-xs font-medium text-slate-100' aria-hidden='true'>
              {notices.map((text, idx) => (
                <span key={`notice-2-${idx}`} className='inline-flex items-center gap-2.5'>
                  <SparklesIcon className='size-3 text-[#f0b429] shrink-0' />
                  <span>{text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slim Gradient Separator Border to distinguish marquee from header */}
      <div className='h-[2px] w-full bg-gradient-to-r from-[#c88718] via-[#ffd56b] to-[#c88718] shadow-xs' />
    </div>
  )
}
