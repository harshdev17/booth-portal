'use client'

import Image from 'next/image'

import { HandshakeIcon, TrendingUpIcon, UsersIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const BENEFITS = [
  {
    icon: UsersIcon,
    title: { en: 'Reach More People', hi: 'आने वाले अधिक लोगों तक पहुँच' },
    desc: {
      en: 'Reach a wider audience at International Gita Jayanti Mahotsav 2026. Showcase your products, connect with new people, and explore opportunities to grow your business.',
      hi: 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 में स्टॉल/बूथ के माध्यम से अपने उत्पादों को प्रदर्शित करने, नए लोगों से जुड़ने और अपने व्यवसाय को आगे बढ़ाने का अवसर प्राप्त करें।'
    }
  },
  {
    icon: HandshakeIcon,
    title: { en: 'Connect with New People', hi: 'नए लोगों से जुड़ने का अवसर' },
    desc: {
      en: 'Meet other business owners, social organizations, and potential customers. Build new relationships and explore opportunities for future collaboration.',
      hi: 'अन्य व्यापारियों, सामाजिक संस्थाओं और संभावित ग्राहकों से मिलें। नए संबंध बनाएँ और भविष्य में सहयोग के अवसर तलाशें।'
    }
  },
  {
    icon: TrendingUpIcon,
    title: { en: 'Grow Your Sales', hi: 'बिक्री बढ़ाने का अवसर' },
    desc: {
      en: 'Showcase your products directly to customers through your stall/booth. Help them learn more about your products and explore opportunities to increase sales.',
      hi: 'स्टॉल/बूथ के माध्यम से अपने उत्पादों को सीधे ग्राहकों तक पहुँचाएँ, उन्हें अपने उत्पादों की जानकारी दें और बिक्री बढ़ाने का प्रयास करें।'
    }
  }
]

/**
 * "Why Participate?" — informational marketing content for the homepage,
 * matching the flat card style already used across the site (see
 * ContactBannerSection.tsx) rather than the gradient/dark reference mockup
 * the section was requested from. Static copy, same pattern as the existing
 * HowItWorks steps — not a configurable business value.
 */
const WhyParticipateSection = () => {
  const { lang } = useLanguage()

  return (
    <section className='px-4 py-20 sm:px-6 border-t border-[#ede5db]/60 bg-[#faf8f5]'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-12 text-left'>
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              {lang === 'hi' ? 'भाग लेने के लाभ' : 'BENEFITS OF PARTICIPATION'}
            </span>
            <div className='relative h-3.5 w-32 sm:w-44 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
              />
            </div>
          </div>

          <h2 className='mb-3 text-3xl sm:text-5xl font-black tracking-tight text-[#0a2c53]'>
            {lang === 'hi' ? 'भाग क्यों लें?' : 'Why Participate?'}
          </h2>
          <p className='max-w-2xl text-base sm:text-lg text-[#4b5d73]'>
            {lang === 'hi'
              ? 'अंतरराष्ट्रीय गीता जयंती में स्टॉल/बूथ लेने के लाभ।'
              : 'Benefits of Setting Up a Stall/Booth at International Gita Jayanti Mahotsav 2026.'}
          </p>
        </div>

        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {BENEFITS.map(benefit => (
            <div
              key={benefit.title.en}
              className='rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-2xs transition hover:shadow-xs'
            >
              <div className='mb-4 flex size-12 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#0c2847]'>
                <benefit.icon className='size-5.5 stroke-[1.8]' />
              </div>
              <h3 className='mb-1.5 text-base font-bold text-[#0c2847]'>{benefit.title[lang]}</h3>
              <p className='text-sm leading-relaxed text-[#64748b]'>{benefit.desc[lang]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyParticipateSection
