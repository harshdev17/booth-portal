'use client'

import React, { useState } from 'react'

import Image from 'next/image'
import { ChevronDownIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

type FaqItem = {
  id: string
  questionHi: string
  questionEn: string
  answerHi: string
  answerEn: string
}

const FAQ_ITEMS: FaqItem[] = [
  // Left Column (Items 1 - 5)
  {
    id: 'faq-1',
    questionHi: 'आवेदन कौन कर सकता है?',
    questionEn: 'Who is eligible to apply?',
    answerHi:
      'कोई भी भारतीय नागरिक, पंजीकृत व्यापारी, कारीगर, स्वयं सहायता समूह, खाद्य व खान-पान विक्रेता अथवा व्यावसायिक प्रतिष्ठान जो केडीबी के पात्रता नियमों और आवश्यक पहचान व व्यापार दस्तावेजों को पूरा करता हो, आवेदन कर सकता है।',
    answerEn:
      'Any Indian citizen, registered merchant, artisan, Self Help Group (SHG), food vendor, or commercial enterprise meeting KDB eligibility rules with valid identity and business documents can apply.'
  },
  {
    id: 'faq-2',
    questionHi: 'कौन-कौन से दस्तावेज़ आवश्यक हैं?',
    questionEn: 'Which documents are required?',
    answerHi:
      'मुख्य रूप से आधार कार्ड/पैन कार्ड, निवास प्रमाण पत्र, बैंक खाता विवरण/रद्द चेक, पासपोर्ट साइज फोटो, और श्रेणी के अनुसार व्यापार/कलाकार पंजीकरण प्रमाण पत्र या एफएसएसएआई (खाद्य स्टॉल हेतु) लाइसेंस आवश्यक है।',
    answerEn:
      'Primary documents include Aadhaar Card / PAN Card, Address Proof, Bank details / cancelled cheque, passport-size photo, and category-specific trade/artisan certificates or FSSAI license (for food stalls).'
  },
  {
    id: 'faq-3',
    questionHi: 'आवेदन शुल्क कितना है?',
    questionEn: 'What is the application fee?',
    answerHi:
      'आवेदन शुल्क स्टॉल श्रेणी पर निर्भर करता है। सामान्य/हस्तशिल्प स्टॉलों के लिए गैर-वापसी योग्य पंजीकरण शुल्क ₹500 से ₹1,000 के मध्य है, जबकि कुछ विशिष्ट सांस्कृतिक श्रेणियों में आवेदन निःशुल्क है। सटीक विवरण श्रेणी कार्ड में देखें।',
    answerEn:
      'The application fee varies by stall category. For general/handicraft stalls, a non-refundable registration fee ranges between ₹500 to ₹1,000, while certain cultural categories are free. See category cards for details.'
  },
  {
    id: 'faq-4',
    questionHi: 'स्टॉल का चयन कैसे होगा?',
    questionEn: 'How will stalls be allotted?',
    answerHi:
      'दस्तावेजों की जांच और सत्यापन के पश्चात, निर्धारित नियमों के अनुसार पारदर्शी कम्प्यूटरीकृत लकी ड्रॉ, ई-नीलामी अथवा केडीबी चयन समिति के माध्यम से निष्पक्ष रूप से आवंटन किया जाएगा।',
    answerEn:
      'Following document scrutiny and verification, stalls are allotted strictly through computerized lucky draws, e-auctions, or KDB screening committees as per specific category rules.'
  },
  {
    id: 'faq-5',
    questionHi: 'आवेदन की स्थिति कैसे देखें?',
    questionEn: 'How can I check application status?',
    answerHi:
      'पोर्टल के "स्थिति जांचें" पृष्ठ पर जाकर अपना आवेदन क्रमांक और डिजिटल एक्सेस कोड दर्ज करके आप वास्तविक समय में स्थिति, दस्तावेज स्वीकृति एवं आवंटन परिणाम देख सकते हैं।',
    answerEn:
      'Visit the portal’s "Status Check" section and enter your Application Number and digital Access Code to track verification, draw eligibility, and allotment results in real time.'
  },

  // Right Column (Items 6 - 10)
  {
    id: 'faq-6',
    questionHi: 'चयन के बाद भुगतान कैसे करना होगा?',
    questionEn: 'How to make payment after selection?',
    answerHi:
      'चयनित आवेदकों को एसएमएस/ईमेल द्वारा सूचित किया जाएगा। वे पोर्टल पर लॉगिन करके निर्धारित समय सीमा के भीतर नेट बैंकिंग, यूपीआई, डेबिट/क्रेडिट कार्ड अथवा आधिकारिक बैंक चालान के माध्यम से आवंटन शुल्क जमा कर सकते हैं।',
    answerEn:
      'Selected applicants will be notified via SMS/Email and can pay the allotment fee via Net Banking, UPI, Cards, or designated bank challan through the portal within the prescribed deadline.'
  },
  {
    id: 'faq-7',
    questionHi: 'क्या आवेदन रद्द किया जा सकता है? और धनवापसी का क्या नियम है?',
    questionEn: 'Can an application be cancelled? What is the refund policy?',
    answerHi:
      'आवेदन जमा करने के बाद पंजीकरण शुल्क अहस्तांतरणीय और गैर-वापसी योग्य होता है। यदि केडीबी द्वारा प्रशासनिक कारणों से कोई श्रेणी निरस्त की जाती है, तो नियमानुसार सिक्योरिटी डिपॉजिट की वापसी प्रक्रिया की जाएगी।',
    answerEn:
      'Application registration fee is non-refundable and non-transferable once submitted. In case of category cancellation by KDB for administrative reasons, applicable deposits will be refunded as per board policy.'
  },
  {
    id: 'faq-8',
    questionHi: 'यदि कोई समस्या आए तो किससे संपर्क करें?',
    questionEn: 'Whom to contact if any issue arises?',
    answerHi:
      'तकनीकी अथवा आवंटन संबंधी सहायता के लिए आप केडीबी हेल्पलाइन नंबर 01744-299xxx पर कार्य दिवसों में प्रातः 9:00 से सायं 5:00 बजे तक संपर्क कर सकते हैं या support@kdb.org.in पर ईमेल भेज सकते हैं।',
    answerEn:
      'For technical or allotment queries, contact the KDB helpline at 01744-299xxx during working hours (9 AM - 5 PM) or email support@kdb.org.in.'
  },
  {
    id: 'faq-9',
    questionHi: 'क्या एक व्यक्ति एक से अधिक स्टॉल के लिए आवेदन कर सकता है?',
    questionEn: 'Can one person apply for multiple stalls?',
    answerHi:
      'एक ही आधार/पैन नंबर पर एक श्रेणी में केवल एक ही आवेदन मान्य है। हालांकि, यदि कोई आवेदक अलग-अलग पात्र श्रेणियों (उदा. हस्तशिल्प और फूड) के लिए अर्हता रखता है, तो वह अलग आवेदन पत्र भर सकता है।',
    answerEn:
      'Only one application per Aadhaar/PAN is permitted within the same category. Applicants eligible for different distinct categories (e.g. Handicrafts and Food) may apply separately for each.'
  },
  {
    id: 'faq-10',
    questionHi: 'स्टॉल का स्थान (लोकेशन) कब और कैसे पता चलेगा?',
    questionEn: 'When and how will the stall location be notified?',
    answerHi:
      'लकी ड्रॉ और शुल्क भुगतान पूर्ण होने के बाद आधिकारिक स्टॉल नंबर व ब्रह्मसरोवर पर उसका सटीक लेआउट मैप पोर्टल पर आपके आवंटन पत्र में दर्शा दिया जाएगा।',
    answerEn:
      'Upon completion of draw selection and payment, the exact stall number and site layout map at Brahma Sarovar will be generated on your downloadable Allotment Letter via the portal.'
  }
]

export default function FaqSection() {
  const { lang } = useLanguage()
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setOpenId(prev => (prev === id ? null : id))
  }

  const leftItems = FAQ_ITEMS.slice(0, 5)
  const rightItems = FAQ_ITEMS.slice(5, 10)

  return (
    <section id='faq' className='relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-[#faf8f5]'>
      {/* Background Image Matching Reference */}
      <div className='absolute inset-0 pointer-events-none select-none z-0'>
        <Image
          src='/images/public/faq-bg.png'
          alt=''
          fill
          className='object-cover object-center opacity-85'
          priority={false}
        />
        {/* Soft overlay gradient ensuring maximum text readability while keeping watermarks visible */}
        <div className='absolute inset-0 bg-gradient-to-b from-[#faf8f5]/40 via-transparent to-[#faf8f5]/60' />
      </div>

      <div className='relative z-10 mx-auto max-w-7xl'>
        {/* Section Header matching portal standard with official gold divider */}
        <div className='mb-12 text-left'>
          {/* Saffron Label with Official Gold Ornamental Divider Image */}
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              {lang === 'hi' ? 'सामान्य प्रश्न एवं उत्तर' : 'FREQUENTLY ASKED QUESTIONS'}
            </span>
            <div className='relative h-3.5 w-32 sm:w-44 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
                priority
              />
            </div>
          </div>

          {/* Heading: अक्सर पूछे जाने वाले प्रश्न */}
          <h2 className='text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0c2847]'>
            {lang === 'hi' ? (
              <>
                अक्सर पूछे जाने वाले <span className='text-[#d8891d]'>प्रश्न</span>
              </>
            ) : (
              <>
                Frequently Asked <span className='text-[#d8891d]'>Questions</span>
              </>
            )}
          </h2>

          {/* Subtitle description */}
          <p className='mt-3 max-w-2xl text-sm sm:text-base text-[#475569] leading-relaxed'>
            {lang === 'hi'
              ? 'यहाँ आपको स्टॉल आवेदन, आवेदन प्रक्रिया, शुल्क, पात्रता और अन्य महत्वपूर्ण जानकारियों से संबंधित सामान्य प्रश्नों के उत्तर मिलेंगे।'
              : 'Here you will find answers to common questions regarding stall applications, procedures, fees, eligibility criteria, and allotment.'}
          </p>
        </div>

        {/* 2-Column FAQ Grid matching reference layout */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 items-start'>
          {/* Left Column */}
          <div className='flex flex-col gap-3.5'>
            {leftItems.map(item => {
              const isOpen = openId === item.id
              const question = lang === 'hi' ? item.questionHi : item.questionEn
              const answer = lang === 'hi' ? item.answerHi : item.answerEn

              return (
                <div
                  key={item.id}
                  className='rounded-xl border border-[#e2e8f0]/90 bg-white/95 backdrop-blur-[2px] shadow-xs hover:border-[#cbd5e1] transition-all'
                >
                  <button
                    type='button'
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold text-[#0c2847] text-sm sm:text-[15px] focus:outline-hidden transition-colors hover:text-[#b8761b]'
                  >
                    <span>{question}</span>
                    <ChevronDownIcon
                      className={`size-4.5 shrink-0 text-[#0c2847] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#b8761b]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className='border-t border-[#f1f5f9] px-5 py-3.5 text-xs sm:text-sm text-[#475569] leading-relaxed bg-[#fcfbf9]/60 rounded-b-xl animate-in fade-in-50 duration-150'>
                      {answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Column */}
          <div className='flex flex-col gap-3.5'>
            {rightItems.map(item => {
              const isOpen = openId === item.id
              const question = lang === 'hi' ? item.questionHi : item.questionEn
              const answer = lang === 'hi' ? item.answerHi : item.answerEn

              return (
                <div
                  key={item.id}
                  className='rounded-xl border border-[#e2e8f0]/90 bg-white/95 backdrop-blur-[2px] shadow-xs hover:border-[#cbd5e1] transition-all'
                >
                  <button
                    type='button'
                    onClick={() => toggleItem(item.id)}
                    aria-expanded={isOpen}
                    className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold text-[#0c2847] text-sm sm:text-[15px] focus:outline-hidden transition-colors hover:text-[#b8761b]'
                  >
                    <span>{question}</span>
                    <ChevronDownIcon
                      className={`size-4.5 shrink-0 text-[#0c2847] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#b8761b]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className='border-t border-[#f1f5f9] px-5 py-3.5 text-xs sm:text-sm text-[#475569] leading-relaxed bg-[#fcfbf9]/60 rounded-b-xl animate-in fade-in-50 duration-150'>
                      {answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
