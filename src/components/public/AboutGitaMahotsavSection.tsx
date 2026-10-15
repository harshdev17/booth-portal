'use client'

import Image from 'next/image'

import { BookOpenIcon, LandmarkIcon, TargetIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const INFO_CARDS = [
  {
    icon: TargetIcon,
    title: { en: 'Objective', hi: 'उद्देश्य' },
    desc: {
      en: 'Promote the teachings of the Srimad Bhagavad Gita across the world.',
      hi: 'श्रीमद्भगवद्गीता की शिक्षाओं को विश्व भर में प्रसारित करना।'
    }
  },
  {
    icon: BookOpenIcon,
    title: { en: 'Mission', hi: 'मिशन' },
    desc: {
      en: 'Enlightening people about the essence and teachings of the Gita.',
      hi: 'लोगों को गीता के सार एवं शिक्षाओं के बारे में प्रबुद्ध करना।'
    }
  },
  {
    icon: LandmarkIcon,
    title: { en: 'About Kurukshetra', hi: 'कुरुक्षेत्र के बारे में' },
    desc: {
      en: 'Kurukshetra is the birthplace of Vedic civilization and ancient texts.',
      hi: 'कुरुक्षेत्र वैदिक सभ्यता एवं प्राचीन ग्रंथों की जन्मभूमि है।'
    }
  }
]

/**
 * "About International Gita Mahotsav" — introductory content sourced from
 * the official festival site (internationalgitamahotsav.in), per explicit
 * request. The photo is this project's own existing Brahmasarovar
 * chariot-statue asset (gita-mahotsav-bg1.png, cropped), not the source
 * site's own illustration, since that image's usage rights are unknown.
 * Styling follows the flat-card pattern already used by
 * WhyParticipateSection.tsx, not the source site's own maroon theme.
 */
const AboutGitaMahotsavSection = () => {
  const { lang } = useLanguage()

  return (
    <section className='border-t border-[#ede5db]/60 bg-[#faf8f5] px-4 py-20 sm:px-6'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid items-center gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-14'>
          <div className='relative mx-auto aspect-[4/3.2] w-full max-w-md overflow-hidden rounded-2xl border border-[#e8dfce] shadow-xs lg:mx-0'>
            <Image
              src='/images/public/about-gita-mahotsav-chariot3.jpg'
              alt={
                lang === 'hi'
                  ? 'श्रीकृष्ण एवं अर्जुन रथ प्रतिमा, ब्रह्मसरोवर'
                  : 'Krishna-Arjuna chariot statue, Brahma Sarovar'
              }
              fill
              className='object-cover'
            />
          </div>

          <div>
            <div className='mb-3 inline-flex items-center gap-3'>
              <span className='shrink-0 text-xs font-extrabold tracking-wider text-[#d8891d] uppercase sm:text-sm'>
                {lang === 'hi' ? 'महोत्सव के बारे में' : 'ABOUT THE MAHOTSAV'}
              </span>
              <div className='relative h-3.5 w-32 shrink-0 sm:w-44'>
                <Image
                  src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                  alt=''
                  fill
                  className='object-contain object-left'
                />
              </div>
            </div>

            <h2 className='mb-5 text-3xl font-black tracking-tight text-[#0a2c53] sm:text-5xl'>
              {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता महोत्सव के बारे में' : 'About International Gita Mahotsav'}
            </h2>

            <div className='space-y-4 text-base leading-relaxed text-[#4b5d73]'>
              {lang === 'hi' ? (
                <>
                  <p>
                    गीता महोत्सव का आयोजन लोगों में नैतिक एवं सांस्कृतिक पुनर्जागरण लाता है। आज के चुनौतीपूर्ण समय में
                    यह और भी प्रासंगिक हो गया है। गीता जयंती महोत्सव मनाने का मुख्य उद्देश्य श्रीमद्भगवद्गीता — साक्षात्
                    गीत — की अमर एवं अमूर्त विरासत से लोगों को प्रबुद्ध करना है।
                  </p>
                  <p>
                    हरियाणा सरकार वर्ष 1989 से कुरुक्षेत्र विकास बोर्ड के सहयोग से कुरुक्षेत्र नगर में गीता महोत्सव का
                    आयोजन कर रही है। प्रारंभ में केवल धार्मिक एवं सांस्कृतिक कार्यक्रम धार्मिक संस्थाओं और कुरुक्षेत्र
                    विकास बोर्ड द्वारा आयोजित किए जाते थे, परंतु बाद में सामाजिक, सांस्कृतिक एवं शैक्षणिक कार्यक्रमों की
                    एक विस्तृत श्रृंखला इस महोत्सव से जुड़ गई। इस अवसर पर सामाजिक संस्थाओं द्वारा रक्तदान शिविर, दंत
                    चिकित्सा एवं नेत्र शिविर आदि आयोजित किए गए। इसके अतिरिक्त, निर्धन युवाओं के विवाह, अनाथ बच्चों को
                    गोद लेना और अन्य जनकल्याणकारी कार्यक्रम भी महोत्सव के आरंभिक वर्षों में आयोजित किए गए।
                  </p>
                </>
              ) : (
                <>
                  <p>
                    The celebration of Gita Mahotsav brings a moral and cultural resurgence among the people. It becomes
                    even more relevant today as we are living in challenging times. The prime objective of celebrating
                    the festival of Gita Jayanti is to enlighten people with the immortal and intangible heritage of the
                    Bhagavad Gita — the song celestial.
                  </p>
                  <p>
                    The Government of Haryana has been celebrating the Gita Mahotsav festival in collaboration with the
                    Kurukshetra Development Board in the city of Kurukshetra since the year 1989. In the beginning, only
                    religious and cultural programs were organized by religious organizations and the Kurukshetra
                    Development Board, but later a wide range of social, cultural and academic programs got incorporated
                    into the festival. On this occasion, social organizations organized blood donation camps, dental
                    care and eye camps, etc. Besides, the marriages of poor youth, adoption of orphans and other welfare
                    programs were also organized during the early years of the celebration.
                  </p>
                </>
              )}
            </div>

            <a
              href='https://internationalgitamahotsav.in/'
              target='_blank'
              rel='noopener noreferrer'
              className='mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--kdb-primary)] bg-[var(--kdb-primary)] px-6 py-3 text-sm font-bold text-white shadow-2xs transition hover:bg-[#061e3a] active:scale-[0.98]'
            >
              {lang === 'hi' ? 'और पढ़ें' : 'Read more'}
              <span aria-hidden='true'>↗</span>
            </a>
          </div>
        </div>

        <div className='mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3'>
          {INFO_CARDS.map(card => (
            <div
              key={card.title.en}
              className='rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center shadow-2xs transition hover:shadow-xs sm:p-7'
            >
              <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#0c2847]'>
                <card.icon className='size-5.5 stroke-[1.8]' />
              </div>
              <h3 className='mb-1.5 text-base font-bold text-[#0c2847]'>{card.title[lang]}</h3>
              <p className='text-sm leading-relaxed text-[#64748b]'>{card.desc[lang]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AboutGitaMahotsavSection
