'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'hi' | 'en'

type LanguageContextType = {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
  showLanguagePrompt: boolean
  choosePreferredLanguage: (lang: Language) => void
}

export const translations: Record<Language, Record<string, string>> = {
  hi: {
    // Header
    'header.title': 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026',
    'header.board': 'कुरुक्षेत्र विकास बोर्ड',
    'nav.home': 'मुख्य पृष्ठ',
    'nav.about': 'परिचय',
    'nav.stalls': 'बूथ/स्टॉल',
    'nav.guidelines': 'दिशानिर्देश',
    'nav.dates': 'महत्वपूर्ण तिथियां',
    'nav.contact': 'संपर्क',
    'nav.apply_now': 'आवेदन करें',

    // Hero
    'hero.badge': 'आधिकारिक बूथ/स्टॉल आबंटन पोर्टल',
    'hero.title_part1': 'हिस्सा बनें',
    'hero.title_part2': 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026',
    'hero.desc': 'ब्रह्मसरोवर, कुरुक्षेत्र पर व्यावसायिक बूथों/स्टॉलों के लिए आवेदन करें। कुरुक्षेत्र विकास बोर्ड द्वारा संचालित आधिकारिक पोर्टल।',
    'hero.btn_apply': 'बूथ/स्टॉल देखें और आवेदन करें',
    'hero.btn_status': 'आवेदन की स्थिति जांचें',

    // Feature strip
    'feature.simple.title': 'सरल',
    'feature.simple.sub': 'ऑनलाइन आवेदन प्रक्रिया',
    'feature.transparent.title': 'पारदर्शी',
    'feature.transparent.sub': 'ड्रॉ आबंटन',
    'feature.secure.title': 'सुरक्षित',
    'feature.secure.sub': 'डिजिटल भुगतान प्रणाली',
    'feature.support.title': 'सहायता',
    'feature.support.sub': 'हेल्पलाइन एवं मार्गदर्शन',

    // Categories
    'categories.badge': 'गीता जयंती महोत्सव 2026 व्यावसायिक स्थान',
    'categories.heading': 'बूथ/स्टॉल श्रेणियां एवं आबंटन',
    'categories.desc': 'ब्रह्मसरोवर मेला क्षेत्र में अपनी पसंदीदा बूथ/स्टॉल श्रेणी चुनें और ऑनलाइन आवेदन प्रस्तुत करें।',
    'categories.empty': 'वर्तमान में कोई बूथ/स्टॉल श्रेणी आवेदन के लिए खुली नहीं है। कृपया शीघ्र जांचें।',
    'categories.apply_now': 'आवेदन करें',
    'categories.view_details': 'विवरण और पात्रता',
    'categories.direct_payment': 'सीधा भुगतान',

    // Widgets
    'status.title': 'बूथ/स्टॉल आवेदन की स्थिति जांचें',
    'status.desc': 'अपने आवेदन क्रमांक और एक्सेस कोड के माध्यम से अपने बूथ/स्टॉल का सत्यापन व आबंटन स्थिति देखें।',
    'status.btn': 'स्थिति जांचें →',
    'notices.title': 'आधिकारिक बूथ/स्टॉल सूचनाएं',
    'notices.desc': 'आवेदन अंतिम तिथि, दस्तावेज जांच, ड्रॉ और बूथ/स्टॉल आबंटन संबंधी आधिकारिक सूचनाएं यहां प्रकाशित होंगी।',

    // How it works
    'how.badge': 'स्टॉल/बूथ आबंटन प्रक्रिया 2026',
    'how.heading': 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में स्टॉल/बूथ आबंटन की प्रक्रिया',
    'how.desc':
      'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 में स्टॉल/बूथ के आबंटन के लिए आवेदन करने से लेकर आवेदन फॉर्म और दस्तावेजों की जाँच, परिणाम जारी होने, आवश्यकतानुसार भुगतान और स्टॉल/बूथ के अंतिम आबंटन तक की प्रक्रिया निम्नलिखित चरणों में पूरी की जाएगी।',
    'how.step1.title': 'ऑनलाइन आवेदन करें',
    'how.step1.desc': 'अपनी श्रेणी का चयन करें और ऑनलाइन आवेदन फॉर्म भरें।',
    'how.step2.title': 'आवेदन शुल्क जमा करें',
    'how.step2.desc':
      'यदि आपकी श्रेणी के लिए आवेदन शुल्क निर्धारित है, तो उसे ऑनलाइन जमा करें। जिन श्रेणियों में आवेदन शुल्क नहीं है, उनके आवेदकों को कोई आवेदन शुल्क नहीं देना होगा।',
    'how.step3.title': 'आवेदन फॉर्म और दस्तावेजों की जाँच',
    'how.step3.desc':
      'कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा आपके आवेदन फॉर्म और जमा किए गए दस्तावेजों की जाँच की जाएगी। स्वीकार होने, अस्वीकार होने अथवा अतिरिक्त जानकारी/दस्तावेज की आवश्यकता होने पर आपको इसकी सूचना WhatsApp और ईमेल के माध्यम से दी जाएगी।',
    'how.step4.title': 'परिणाम जारी होगा',
    'how.step4.desc':
      'प्रत्येक श्रेणी की गाइडलाइंस में दी गई तारीख को परिणाम जारी किया जाएगा। आवेदक अपना परिणाम पोर्टल पर देख सकते हैं। इसकी जानकारी आवेदन करते समय दिए गए WhatsApp नंबर और ईमेल पते पर भी भेजी जाएगी।',
    'how.step5.title': 'स्टॉल/बूथ की आबंटन राशि जमा करें',
    'how.step5.desc':
      'यदि आपकी श्रेणी के लिए स्टॉल/बूथ की आबंटन राशि निर्धारित है, तो परिणाम जारी होने के बाद संबंधित राशि जमा करें। जिन श्रेणियों में स्टॉल/बूथ निःशुल्क हैं, उनके लिए आबंटन राशि जमा करने की आवश्यकता नहीं होगी। राशि और भुगतान से संबंधित जानकारी अपनी श्रेणी की गाइडलाइंस में देखें।',
    'how.step6.title': 'स्टॉल/बूथ का आबंटन',
    'how.step6.desc':
      'चयन प्रक्रिया और आवश्यक भुगतान पूरा होने के बाद सफल आवेदकों को स्टॉल/बूथ आबंटन की आधिकारिक पुष्टि प्रदान की जाएगी।',

    // Banner & Trust
    'banner.badge': 'कुरुक्षेत्र विकास बोर्ड',
    'banner.title': 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026',
    'banner.desc': 'हस्तशिल्पियों, खान-पान विक्रेताओं, सांस्कृतिक प्रदर्शकों एवं व्यापारियों हेतु ब्रह्मसरोवर पर प्रमुख व्यावसायिक स्थल।',
    'quicklinks.title': 'त्वरित लिंक',
    'trust.category': 'श्रेणियां',
    'trust.transparent': 'पारदर्शी प्रक्रिया',
    'trust.equal': 'समान अवसर',
    'trust.citizen': 'नागरिक अनुकूल',

    // Footer
    'footer.board': 'कुरुक्षेत्र विकास बोर्ड',
    'footer.undertaking': 'हरियाणा सरकार का उपक्रम',
    'footer.motto': 'विरासत | सद्भाव | प्रगति',
    'footer.rights': '© 2026 कुरुक्षेत्र विकास बोर्ड। सर्वाधिकार सुरक्षित।'
  },
  en: {
    // Header
    'header.title': 'International Geeta Jayanti Mahotsav 2026',
    'header.board': 'Kurukshetra Development Board',
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.stalls': 'Stalls',
    'nav.guidelines': 'Guidelines',
    'nav.dates': 'Important Dates',
    'nav.contact': 'Contact',
    'nav.apply_now': 'Apply Now',

    // Hero
    'hero.badge': 'Official Allotment Portal',
    'hero.title_part1': 'Be a Part of',
    'hero.title_part2': 'Geeta Jayanti Mahotsav 2026',
    'hero.desc': 'Apply for commercial booths/stalls and retail spaces at prime mela locations. Managed by Kurukshetra Development Board.',
    'hero.btn_apply': 'Explore Booths/Stalls & Apply',
    'hero.btn_status': 'Track Application',

    // Feature strip
    'feature.simple.title': 'Simple',
    'feature.simple.sub': 'Online Application',
    'feature.transparent.title': 'Transparent',
    'feature.transparent.sub': 'Draw Process',
    'feature.secure.title': 'Secure',
    'feature.secure.sub': 'Digital Payments',
    'feature.support.title': 'Support',
    'feature.support.sub': '& Helpline',

    // Categories
    'categories.badge': 'Geeta Jayanti Mahotsav 2026 Commercial Spaces',
    'categories.heading': 'Booth/Stall Categories & Allotment',
    'categories.desc': 'Select your preferred commercial booth/stall category at Brahma Sarovar, Kurukshetra and submit your official application.',
    'categories.empty': 'No booth/stall categories are currently open for application. Official notification will be released soon.',
    'categories.apply_now': 'Apply Now',
    'categories.view_details': 'View Details & Criteria',
    'categories.direct_payment': 'Direct Payment',

    // Widgets
    'status.title': 'Track Booth/Stall Application Status',
    'status.desc': 'Enter your Application Number and Access Code to check document verification, draw eligibility, and allotment results for your mela booth.',
    'status.btn': 'Track Booth/Stall Status →',
    'notices.title': 'Official Booth/Stall Notices',
    'notices.desc': 'Official schedule for application deadlines, document scrutiny dates, draw sessions, and allotment notifications for Geeta Jayanti Mahotsav 2026 booths/stalls will be published here.',

    // How it works
    'how.badge': 'Booth/Stall Allotment Process 2026',
    'how.heading': 'How International Gita Jayanti Mahotsav Booth/Stall Application Allotment Works',
    'how.desc':
      'The booth/stall allotment process for International Gita Jayanti Mahotsav 2026 includes online application, application and document verification, result announcement, payment (where required), and final booth/stall allotment. The process is explained below step by step.',
    'how.step1.title': 'Apply Online',
    'how.step1.desc': 'Choose your category and fill out the online application form.',
    'how.step2.title': 'Pay the Application Fee',
    'how.step2.desc':
      'If an application fee applies to your category, pay it online. Applicants in categories with no application fee do not need to pay any fee.',
    'how.step3.title': 'Application and Document Verification',
    'how.step3.desc':
      'Kurukshetra Development Board (KDB) will check your application form and submitted documents. You will be notified via WhatsApp and email if your application is accepted, rejected, or if additional documents or information are required.',
    'how.step4.title': 'Result Announced',
    'how.step4.desc':
      'The result will be announced on the date mentioned in the guidelines for each category. Applicants can check their results on the portal or receive them through WhatsApp and email using the contact details provided in their application.',
    'how.step5.title': 'Pay the Booth/Stall Allotment Amount',
    'how.step5.desc':
      'If an allotment amount applies to your category, pay it after the result is announced. No allotment payment is required for categories where booths/stalls are provided free of charge. Check your category guidelines for payment details.',
    'how.step6.title': 'Booth/Stall Allotment',
    'how.step6.desc':
      'Once the selection process and any required payment are complete, successful applicants will receive official confirmation of their booth/stall allotment.',

    // Banner & Trust
    'banner.badge': 'Kurukshetra Development Board',
    'banner.title': 'International Geeta Jayanti Mahotsav 2026',
    'banner.desc': 'Prime commercial spaces at Brahma Sarovar for artisans, food vendors, cultural exhibitors, and trade booths/stalls.',
    'quicklinks.title': 'Quick Links',
    'trust.category': 'Categories',
    'trust.transparent': 'Transparent Process',
    'trust.equal': 'Equal Opportunity',
    'trust.citizen': 'Citizen Friendly',

    // Footer
    'footer.board': 'Kurukshetra Development Board',
    'footer.undertaking': 'Haryana Government Undertaking',
    'footer.motto': 'Heritage | Harmony | Progress',
    'footer.rights': '© 2026 Kurukshetra Development Board. All Rights Reserved.'
  }
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'hi',
  setLang: () => {},
  t: (key: string) => key,
  showLanguagePrompt: false,
  choosePreferredLanguage: () => {}
})

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>('hi')

  // Shown only on a visitor's very first load, when no language has been
  // picked yet (localStorage empty) — not on every visit, and never again
  // once a choice is cached. Starts false so SSR/first client render match
  // (no hydration mismatch) and flips true from the effect below if needed.
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kdb_lang') as Language

    if (saved === 'hi' || saved === 'en') {
      setLangState(saved)
    } else {
      setShowLanguagePrompt(true)
    }
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('kdb_lang', newLang)
  }

  // Used by the first-visit prompt specifically — sets the language AND
  // dismisses the prompt in one call, distinct from setLang (used by the
  // header's always-available Hindi/English toggle, which never needs to
  // touch the prompt).
  const choosePreferredLanguage = (newLang: Language) => {
    setLang(newLang)
    setShowLanguagePrompt(false)
  }

  const t = (key: string) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, showLanguagePrompt, choosePreferredLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
