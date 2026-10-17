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
  // Left Column (Items 1 - 6)
  {
    id: 'faq-1',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल के लिए कौन आवेदन कर सकता है?',
    questionEn: 'Who can apply for a booth/stall at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'केवल वही व्यक्ति, संस्था, व्यापारी, कारीगर, स्वयं सहायता समूह (SHG) या अन्य आवेदक बूथ/स्टॉल के लिए आवेदन कर सकता है, जो संबंधित श्रेणी की निर्धारित पात्रता शर्तों को पूरा करता हो। जिस श्रेणी के लिए आप आवेदन करना चाहते हैं, उसके दिशानिर्देश ध्यानपूर्वक पढ़ें। यदि आप उस श्रेणी की सभी निर्धारित पात्रता शर्तों को पूरा करते हैं, तो बूथ/स्टॉल के लिए आवेदन कर सकते हैं।',
    answerEn:
      'Only an individual, organisation, trader, artisan, Self Help Group (SHG), or other applicant who meets the eligibility conditions prescribed for that category can apply for a booth/stall. Read the guidelines for the category you wish to apply under carefully. If you meet all the prescribed eligibility conditions for that category, you can apply for a booth/stall.'
  },
  {
    id: 'faq-2',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल आवेदन के लिए कौन-कौन से दस्तावेज़ आवश्यक हैं?',
    questionEn: 'Which documents are required for a booth/stall application at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'आवश्यक दस्तावेज़ संबंधित श्रेणी के अनुसार अलग-अलग हो सकते हैं। इनमें आधार कार्ड या वैध पहचान पत्र, संस्था या व्यवसाय का पंजीकरण प्रमाणपत्र, GST प्रमाणपत्र या PAN कार्ड, उत्पादों की तस्वीरें, उत्पादों का विवरण और अन्य संबंधित दस्तावेज़ शामिल हो सकते हैं। कुछ श्रेणियों में अधिकृत प्रतिनिधि का पहचान पत्र, प्राधिकरण पत्र या अन्य विशेष दस्तावेज़ भी आवश्यक हो सकते हैं। आवेदन करने से पहले संबंधित श्रेणी के दिशानिर्देशों में दी गई दस्तावेज़ सूची ध्यानपूर्वक पढ़ें और सभी आवश्यक दस्तावेज़ तैयार रखें।',
    answerEn:
      'The required documents vary by category. These may include an Aadhaar Card or valid identity proof, the organisation/business registration certificate, GST certificate or PAN card, product photographs, product details, and other related documents. Some categories may also require the authorized representative’s identity proof, an authorization letter, or other special documents. Before applying, read the document list in your category’s guidelines carefully and keep all required documents ready.'
  },
  {
    id: 'faq-3',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल के लिए आवेदन शुल्क कितना है?',
    questionEn: 'What is the application fee for a booth/stall at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'आवेदन शुल्क संबंधित श्रेणी के अनुसार निर्धारित है। जिन श्रेणियों में ₹236 आवेदन शुल्क लागू है, उसमें ₹200 शुल्क और 18% GST शामिल है। यह शुल्क गैर-वापसी योग्य है। स्टॉल निःशुल्क होने पर भी आवेदन शुल्क देना पड़ सकता है। आवेदन करने से पहले अपनी श्रेणी के दिशानिर्देशों में आवेदन शुल्क की पुष्टि करें।',
    answerEn:
      'The application fee is fixed category by category. Where a ₹236 application fee applies, it includes a ₹200 fee plus 18% GST. This fee is non-refundable. Even when the stall itself is free, an application fee may still be payable. Before applying, confirm the application fee in your category’s guidelines.'
  },
  {
    id: 'faq-4',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल का चयन और आबंटन कैसे होगा?',
    questionEn: 'How will booth/stall selection and allotment work at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'बूथ/स्टॉल का चयन और आबंटन संबंधित श्रेणी के नियमों, पात्रता शर्तों, सत्यापन और कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा निर्धारित प्रक्रिया के अनुसार किया जाएगा। यदि सत्यापन के बाद पात्र आवेदनों की संख्या उपलब्ध बूथ/स्टॉल की संख्या के भीतर रहती है, तो नियमों के अनुसार सीधे आबंटन किया जा सकता है। यदि पात्र आवेदनों की संख्या उपलब्ध बूथ/स्टॉल से अधिक होती है, तो संबंधित श्रेणी के नियमों के अनुसार ड्रॉ कराया जा सकता है। कुछ श्रेणियों में चयन या आबंटन की अलग प्रक्रिया भी हो सकती है। आवेदन करने मात्र से बूथ/स्टॉल मिलना सुनिश्चित नहीं होता।',
    answerEn:
      'Booth/stall selection and allotment will be carried out according to the respective category’s rules, eligibility conditions, verification, and the process prescribed by the Kurukshetra Development Board (KDB). If, after verification, the number of eligible applications is within the number of available booths/stalls, direct allotment may be made as per the rules. If eligible applications exceed the available booths/stalls, a draw may be held as per that category’s rules. Some categories may follow a different selection or allotment process. Submitting an application alone does not guarantee a booth/stall.'
  },
  {
    id: 'faq-5',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 के बूथ/स्टॉल आवेदन की स्थिति कैसे देखें?',
    questionEn: 'How can I check the status of my booth/stall application for International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'आवेदन जमा करने के बाद आधिकारिक पोर्टल पर उपलब्ध आवेदन स्थिति देखने की सुविधा का उपयोग करें। आवेदन की स्थिति देखने के लिए आवेदन संख्या या पोर्टल पर मांगी गई अन्य जानकारी की आवश्यकता हो सकती है। आवेदन के सत्यापन, चयन और बूथ/स्टॉल आबंटन से संबंधित अपडेट के लिए आधिकारिक पोर्टल पर नियमित रूप से जानकारी देखते रहें।',
    answerEn:
      'After submitting your application, use the application status facility available on the official portal. You may need your application number or other details requested by the portal to check your status. Keep checking the official portal regularly for updates on document verification, selection, and booth/stall allotment.'
  },
  {
    id: 'faq-6',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल आबंटित होने के बाद भुगतान कैसे करना होगा?',
    questionEn: 'How do I make payment after a booth/stall is allotted at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'बूथ/स्टॉल आबंटित होने के बाद भुगतान की प्रक्रिया संबंधित श्रेणी के दिशा-निर्देशों के अनुसार पूरी करनी होगी। भुगतान की राशि, अंतिम तिथि और तरीका श्रेणी के अनुसार अलग-अलग हो सकते हैं। कुछ श्रेणियों में बूथ/स्टॉल निःशुल्क होते हैं, जबकि कुछ में निर्धारित आबंटन राशि या अन्य शुल्क जमा करना आवश्यक होता है। भुगतान करने से पहले आधिकारिक निर्देश ध्यानपूर्वक पढ़ें और भुगतान का प्रमाण सुरक्षित रखें।',
    answerEn:
      'Once a booth/stall is allotted, the payment process must be completed as per that category’s guidelines. The payment amount, deadline, and method may differ by category. Some categories offer the booth/stall free of cost, while others require the prescribed allotment amount or other charges to be paid. Before making payment, read the official instructions carefully and keep proof of payment safe.'
  },

  // Right Column (Items 7 - 12)
  {
    id: 'faq-7',
    questionHi: 'क्या अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 के बूथ/स्टॉल आवेदन को रद्द किया जा सकता है? क्या आवेदन शुल्क वापस मिलेगा?',
    questionEn: 'Can a booth/stall application for International Gita Jayanti Mahotsav 2026 be cancelled? Will the application fee be refunded?',
    answerHi:
      'आवेदन रद्द करने या बूथ/स्टॉल का आबंटन निरस्त करने से संबंधित नियम संबंधित श्रेणी और KDB की निर्धारित शर्तों के अनुसार लागू होंगे। गलत जानकारी देने, आवश्यक दस्तावेज़ उपलब्ध न कराने या निर्धारित नियमों का उल्लंघन करने पर आवेदन या आबंटन रद्द किया जा सकता है। आवेदन शुल्क गैर-वापसी योग्य है, इसलिए आवेदन अस्वीकार होने या बूथ/स्टॉल न मिलने पर भी यह वापस नहीं किया जाएगा। अन्य जमा राशियों की वापसी या समायोजन, जहाँ लागू हो, संबंधित श्रेणी के नियमों के अनुसार होगा।',
    answerEn:
      'Rules regarding cancelling an application or revoking a booth/stall allotment apply as per that category’s and KDB’s prescribed conditions. An application or allotment may be cancelled for providing false information, not furnishing the required documents, or violating the prescribed rules. The application fee is non-refundable, so it will not be returned even if the application is rejected or no booth/stall is allotted. Refund or adjustment of any other amount deposited, where applicable, will follow that category’s rules.'
  },
  {
    id: 'faq-8',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 के बूथ/स्टॉल आवेदन या आबंटन से संबंधित समस्या होने पर किससे संपर्क करें?',
    questionEn: 'Who should I contact for a problem with my booth/stall application or allotment for International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'आवेदन प्रक्रिया, दस्तावेज़ अपलोड करने, भुगतान, आवेदन की स्थिति या बूथ/स्टॉल आबंटन से संबंधित समस्या होने पर आधिकारिक पोर्टल पर दिए गए संपर्क विवरण के माध्यम से संबंधित प्राधिकरण से संपर्क करें। संपर्क करते समय अपना आवेदन नंबर और समस्या से संबंधित जानकारी तैयार रखें। किसी भी सहायता या जानकारी के लिए आधिकारिक पोर्टल पर उपलब्ध निर्देशों का पालन करें।',
    answerEn:
      'For any issue related to the application process, document upload, payment, application status, or booth/stall allotment, contact the concerned authority using the contact details given on the official portal. Keep your application number and details of the issue ready when contacting them. For any help or information, follow the instructions available on the official portal.'
  },
  {
    id: 'faq-9',
    questionHi: 'क्या अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में एक व्यक्ति या संस्था एक से अधिक बूथ/स्टॉल के लिए आवेदन कर सकती है?',
    questionEn: 'Can an individual or organisation apply for more than one booth/stall at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'नहीं, एक व्यक्ति, संस्था या व्यापारी अपनी पात्र श्रेणी में केवल एक ही आवेदन कर सकता है। यदि कोई व्यक्ति या संस्था अपनी पहचान छिपाकर या बदलकर एक से अधिक बूथ/स्टॉल के लिए आवेदन करती पाई जाती है, तो कुरुक्षेत्र विकास बोर्ड द्वारा उसका बूथ/स्टॉल आबंटन निरस्त किया जाएगा तथा नियमानुसार उचित कार्रवाई की जाएगी।',
    answerEn:
      'No, an individual, organisation, or trader can submit only one application under their eligible category. If any individual or organisation is found applying for more than one booth/stall by concealing or altering their identity, their booth/stall allotment will be cancelled by the Kurukshetra Development Board and appropriate action will be taken as per rules.'
  },
  {
    id: 'faq-10',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल की लोकेशन कहाँ देख सकते हैं?',
    questionEn: 'Where can I see the booth/stall location for International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'बूथ/स्टॉल की लोकेशन देखने के लिए आधिकारिक पोर्टल पर अपलोड किया गया स्टॉल लोकेशन मैप देखें। इस मैप से आयोजन स्थल पर बूथ/स्टॉल के स्थान और संबंधित क्षेत्रों की जानकारी प्राप्त की जा सकती है। हालांकि, किसी विशेष बूथ/स्टॉल का अंतिम स्थान, नंबर और आकार KDB द्वारा निर्धारित प्रक्रिया तथा उपलब्धता के अनुसार तय किया जाएगा। मैप पर किसी स्थान को देख लेने मात्र से उस स्थान का आबंटन सुनिश्चित नहीं होता।',
    answerEn:
      'To see the booth/stall location, refer to the stall location map uploaded on the official portal. This map shows the location of booths/stalls and related areas at the event venue. However, the final location, number, and size of a particular booth/stall will be decided by KDB as per the prescribed process and availability. Viewing a location on the map alone does not guarantee allotment of that location.'
  },
  {
    id: 'faq-11',
    questionHi: 'क्या अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में आवेदन करने से बूथ/स्टॉल मिलना सुनिश्चित है?',
    questionEn: 'Does applying guarantee a booth/stall at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'नहीं। आवेदन जमा करने से बूथ/स्टॉल का आबंटन सुनिश्चित नहीं होता। सभी आवेदनों का संबंधित श्रेणी की पात्रता शर्तों और निर्धारित प्रक्रिया के अनुसार सत्यापन किया जाएगा। बूथ/स्टॉल की आबंटन प्रक्रिया के बारें में अधिक जानने के लिए आप दिशा-निर्देश पृष्ठ पढ़ सकते हैं।',
    answerEn:
      'No. Submitting an application does not guarantee booth/stall allotment. All applications will be verified according to the relevant category’s eligibility conditions and the prescribed process. To learn more about the booth/stall allotment process, you can read the Guidelines page.'
  },
  {
    id: 'faq-12',
    questionHi: 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में बूथ/स्टॉल के लिए आवेदन करने से पहले किन बातों का ध्यान रखना चाहिए?',
    questionEn: 'What should I keep in mind before applying for a booth/stall at International Gita Jayanti Mahotsav 2026?',
    answerHi:
      'आवेदन करने से पहले अपनी इच्छित श्रेणी के दिशानिर्देश ध्यानपूर्वक पढ़ें। सुनिश्चित करें कि आप उस श्रेणी की पात्रता शर्तों को पूरा करते हैं और आपके पास सभी आवश्यक दस्तावेज़ उपलब्ध हैं। आवेदन फॉर्म में सही जानकारी भरें, निर्धारित आवेदन शुल्क जमा करें और आवेदन की अंतिम तिथि का ध्यान रखें। साथ ही, स्टॉल लोकेशन मैप, आबंटन राशि, भुगतान संबंधी नियमों और अन्य महत्वपूर्ण निर्देशों को भी पढ़ें। आवेदन जमा करने से पहले सभी जानकारी और दस्तावेज़ों की जाँच कर लें।',
    answerEn:
      'Before applying, read the guidelines for the category you wish to apply under carefully. Make sure you meet that category’s eligibility conditions and have all the required documents ready. Fill in the application form correctly, pay the prescribed application fee, and keep the application deadline in mind. Also read the stall location map, allotment amount, payment-related rules, and other important instructions. Check all information and documents carefully before submitting your application.'
  }
]

export default function FaqSection() {
  const { lang } = useLanguage()
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setOpenId(prev => (prev === id ? null : id))
  }

  const leftItems = FAQ_ITEMS.slice(0, 6)
  const rightItems = FAQ_ITEMS.slice(6, 12)

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
              ? 'यहाँ आपको बूथ/स्टॉल आवेदन, आवेदन प्रक्रिया, शुल्क, पात्रता और अन्य महत्वपूर्ण जानकारियों से संबंधित सामान्य प्रश्नों के उत्तर मिलेंगे।'
              : 'Here you will find answers to common questions regarding booth/stall applications, procedures, fees, eligibility criteria, and allotment.'}
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
