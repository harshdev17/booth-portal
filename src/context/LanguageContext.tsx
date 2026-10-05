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
    'hero.badge': 'आधिकारिक स्टॉल आवंटन पोर्टल',
    'hero.title_part1': 'हिस्सा बनें',
    'hero.title_part2': 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026',
    'hero.desc': 'ब्रह्मसरोवर, कुरुक्षेत्र पर व्यावसायिक बूथों/स्टॉलों के लिए आवेदन करें। कुरुक्षेत्र विकास बोर्ड द्वारा संचालित आधिकारिक पोर्टल।',
    'hero.btn_apply': 'स्टॉल देखें और आवेदन करें',
    'hero.btn_status': 'आवेदन की स्थिति जांचें',

    // Feature strip
    'feature.simple.title': 'सरल',
    'feature.simple.sub': 'ऑनलाइन आवेदन प्रक्रिया',
    'feature.transparent.title': 'पारदर्शी',
    'feature.transparent.sub': 'लकी ड्रॉ आवंटन',
    'feature.secure.title': 'सुरक्षित',
    'feature.secure.sub': 'डिजिटल भुगतान प्रणाली',
    'feature.support.title': 'सहायता',
    'feature.support.sub': 'हेल्पलाइन एवं मार्गदर्शन',

    // Categories
    'categories.badge': 'गीता जयंती महोत्सव 2026 व्यावसायिक स्थान',
    'categories.heading': 'स्टॉल श्रेणियां एवं आवंटन',
    'categories.desc': 'ब्रह्मसरोवर मेला क्षेत्र में अपनी पसंदीदा स्टॉल श्रेणी चुनें और ऑनलाइन आवेदन प्रस्तुत करें।',
    'categories.empty': 'वर्तमान में कोई स्टॉल श्रेणी आवेदन के लिए खुली नहीं है। कृपया शीघ्र जांचें।',
    'categories.apply_now': 'आवेदन करें',
    'categories.view_details': 'विवरण और पात्रता',
    'categories.direct_payment': 'सीधा भुगतान',

    // Widgets
    'status.title': 'स्टॉल आवेदन की स्थिति जांचें',
    'status.desc': 'अपने आवेदन क्रमांक और एक्सेस कोड के माध्यम से अपने स्टॉल का सत्यापन व आवंटन स्थिति देखें।',
    'status.btn': 'स्थिति जांचें →',
    'notices.title': 'आधिकारिक स्टॉल सूचनाएं',
    'notices.desc': 'आवेदन अंतिम तिथि, दस्तावेज जांच, लकी ड्रॉ और स्टॉल आवंटन संबंधी आधिकारिक सूचनाएं यहां प्रकाशित होंगी।',

    // How it works
    'how.badge': 'आवंटन प्रक्रिया',
    'how.heading': 'स्टॉल आवंटन कैसे कार्य करता है?',
    'how.desc': 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 हेतु स्टॉल आवेदन, सत्यापन एवं आवंटन की पारदर्शी डिजिटल प्रक्रिया।',
    'how.step1.title': 'ऑनलाइन आवेदन',
    'how.step1.desc': 'स्टॉल श्रेणी चुनें और आवेदन पत्र भरें',
    'how.step2.title': 'आवेदन शुल्क',
    'how.step2.desc': 'सुरक्षित ऑनलाइन माध्यम से निर्धारित शुल्क जमा करें',
    'how.step3.title': 'दस्तावेज जांच',
    'how.step3.desc': 'केडीबी अधिकारियों द्वारा अपलोड दस्तावेजों की जांच',
    'how.step4.title': 'चयन / लकी ड्रॉ',
    'how.step4.desc': 'श्रेणी नियमों के अनुसार पारदर्शी लकी ड्रॉ अथवा ई-नीलामी',
    'how.step5.title': 'स्टॉल आवंटन',
    'how.step5.desc': 'सत्यापित क्यूआर कोड युक्त आधिकारिक आवंटन पत्र डाउनलोड करें',

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
    'hero.desc': 'Apply for commercial booths, stalls, and retail spaces at prime mela locations. Managed by Kurukshetra Development Board.',
    'hero.btn_apply': 'Explore Stalls & Apply',
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
    'categories.heading': 'Stall Categories & Allotment',
    'categories.desc': 'Select your preferred commercial stall or booth category at Brahma Sarovar, Kurukshetra and submit your official application.',
    'categories.empty': 'No stall categories are currently open for application. Official notification will be released soon.',
    'categories.apply_now': 'Apply Now',
    'categories.view_details': 'View Details & Criteria',
    'categories.direct_payment': 'Direct Payment',

    // Widgets
    'status.title': 'Track Stall Application Status',
    'status.desc': 'Enter your Application Number and Access Code to check document verification, draw eligibility, and allotment results for your mela booth.',
    'status.btn': 'Track Stall Status →',
    'notices.title': 'Official Stall Notices',
    'notices.desc': 'Official schedule for application deadlines, document scrutiny dates, lucky draw sessions, and allotment notifications for Geeta Jayanti Mahotsav 2026 stalls will be published here.',

    // How it works
    'how.badge': 'Allotment Procedure',
    'how.heading': 'How Stall Allotment Works',
    'how.desc': 'Transparent, digital procedure for booth application, document verification, and stall allotment for International Geeta Jayanti Mahotsav 2026.',
    'how.step1.title': 'Apply Online',
    'how.step1.desc': 'Choose your stall category & fill booth application form',
    'how.step2.title': 'Application Fee',
    'how.step2.desc': 'Pay the official non-refundable registration fee online',
    'how.step3.title': 'Document Verification',
    'how.step3.desc': 'Submitted documents & KYC verified by KDB officials',
    'how.step4.title': 'Selection / Draw',
    'how.step4.desc': 'Transparent lucky draw or e-auction as per category rules',
    'how.step5.title': 'Stall Allotment',
    'how.step5.desc': 'Download official allotment letter with QR verification',

    // Banner & Trust
    'banner.badge': 'Kurukshetra Development Board',
    'banner.title': 'International Geeta Jayanti Mahotsav 2026',
    'banner.desc': 'Prime commercial spaces at Brahma Sarovar for artisans, food vendors, cultural exhibitors, and trade stalls.',
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
