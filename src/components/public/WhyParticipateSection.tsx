'use client'

import Image from 'next/image'

import {
  HandshakeIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  TagIcon,
  TrendingUpIcon,
  UsersIcon
} from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const BENEFITS = [
  {
    icon: UsersIcon,
    title: { en: 'High Foot Traffic', hi: 'उच्च दर्शक संख्या' },
    desc: {
      en: 'Get exposure to thousands of event visitors and promote your brand effectively.',
      hi: 'हजारों मेला आगंतुकों तक पहुंच पाएं और अपने ब्रांड को प्रभावी ढंग से बढ़ावा दें।'
    }
  },
  {
    icon: HandshakeIcon,
    title: { en: 'Networking Opportunities', hi: 'नेटवर्किंग के अवसर' },
    desc: {
      en: 'Meet other businesses, NGOs, and potential customers to grow your network.',
      hi: 'अन्य व्यवसायों, एनजीओ और संभावित ग्राहकों से मिलें और अपना नेटवर्क बढ़ाएं।'
    }
  },
  {
    icon: TrendingUpIcon,
    title: { en: 'Direct Sales Boost', hi: 'प्रत्यक्ष बिक्री वृद्धि' },
    desc: {
      en: 'Increase your sales with a dedicated booth at the event, reaching targeted customers.',
      hi: 'मेले में समर्पित बूथ के साथ लक्षित ग्राहकों तक पहुंचकर अपनी बिक्री बढ़ाएं।'
    }
  },
  {
    icon: MegaphoneIcon,
    title: { en: 'Marketing Support', hi: 'मार्केटिंग सहायता' },
    desc: {
      en: 'Benefit from event marketing campaigns to further promote your booth.',
      hi: 'अपने बूथ को और बढ़ावा देने के लिए मेले के मार्केटिंग अभियानों का लाभ उठाएं।'
    }
  },
  {
    icon: TagIcon,
    title: { en: 'Exclusive Discounts', hi: 'विशेष छूट' },
    desc: {
      en: 'Access exclusive discounts and perks as a registered booth partner.',
      hi: 'पंजीकृत बूथ पार्टनर के रूप में विशेष छूट एवं लाभ प्राप्त करें।'
    }
  },
  {
    icon: MessageSquareIcon,
    title: { en: 'Customer Feedback', hi: 'ग्राहक प्रतिक्रिया' },
    desc: {
      en: 'Engage directly with customers and receive feedback to improve your offerings.',
      hi: 'ग्राहकों से सीधे जुड़ें और अपने उत्पाद/सेवाओं को बेहतर बनाने हेतु प्रतिक्रिया प्राप्त करें।'
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
              ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026 में स्टॉल लेने से आपके व्यवसाय को मिलने वाले लाभ।'
              : 'The advantages your business gains by taking a stall at International Gita Mahotsav 2026.'}
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
