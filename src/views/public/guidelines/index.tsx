'use client'

import { useLanguage } from '@/context/LanguageContext'

type Category = {
  title: string
  titleHi: string
  body: Array<{ en: string; hi: string }>
}

// Content supplied directly (2026-09-29), relabeled from the source
// "2025"-dated text to the 2026 event per instruction — dates/fees/venue
// text below are carried over verbatim from that source and are NOT yet
// reconciled with the admin-configurable auction_date/auction_venue fields
// added in migration 0009 for the application form's instructions panel;
// update this page's text once official 2026 dates/fees are confirmed
// (see .ai/OPEN_QUESTIONS.md).
const CATEGORIES: Category[] = [
  {
    title: 'Social Organisation (NGO)',
    titleHi: 'सामाजिक संस्था (NGO)',
    body: [
      {
        en: 'Any social organisation (NGO) wishing to take a shop/stall at the International Gita Jayanti Mahotsav 2026 must be a duly registered organisation.',
        hi: 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 में किसी भी सामाजिक संस्था (NGO) द्वारा दुकान / स्टॉल लेने के लिए संस्था का विधिवत पंजीकृत होना अनिवार्य है।'
      },
      {
        en: "To apply in this category, the organisation representative's Aadhaar card and the organisation's Registration Certificate must be attached.",
        hi: 'इस श्रेणी में आवेदन करने हेतु संस्था के प्रतिनिधि का आधार कार्ड तथा संस्था का पंजीकरण प्रमाण पत्र (Registration Certificate) संलग्न करना आवश्यक है।'
      }
    ]
  },
  {
    title: 'Refreshment Food Stall (Through Auction)',
    titleHi: 'रिफ्रेशमेंट फूड स्टॉल (Through Auction)',
    body: [
      {
        en: "Applicants for a refreshment stall must attach their Aadhaar card and any one certificate related to their business. Participants in this category may not use cylinders etc. — only pre-packed food items may be sold.",
        hi: 'रिफ्रेशमेंट स्टॉल हेतु आवेदन करने वाले प्रतिभागी को अपना आधार कार्ड एवं व्यवसाय से संबंधित कोई भी एक प्रमाण पत्र संलग्न करना अनिवार्य है। इस कैटेगरी में प्रतिभागी सिलेंडर इत्यादि का इस्तेमाल नहीं कर सकता। केवल बने हुए पैक्ड फूड्स ही सेल कर सकता है।'
      },
      {
        en: 'Participants wishing to take part in the auction must apply by 6 November (11:59 PM).',
        hi: 'नीलामी (Auction) में भाग लेने के इच्छुक प्रतिभागी को 6 नवम्बर, शाम 23:59 बजे तक आवेदन करना होगा।'
      },
      {
        en: 'The starting bid amount for a refreshment stall is ₹30,000 for a small shop and ₹50,000 for a large shop. The auction dates are 7 and 8 November.',
        hi: 'रिफ्रेशमेंट स्टॉल हेतु बोली की प्रारंभिक राशि छोटी दुकान के लिए ₹30,000/- एवं बड़ी दुकान के लिए ₹50,000/- निर्धारित की गई है। नीलामी की तिथि 7 एवं 8 नवंबर है।'
      }
    ]
  },
  {
    title: 'Artisan (Card Holder)',
    titleHi: 'कलाकार (Artisan - Card Holder)',
    body: [
      {
        en: 'To apply in this category, the participant must hold an Artisan Registration Card/Certificate.',
        hi: 'इस श्रेणी में आवेदन करने के लिए प्रतिभागी के पास कलाकार पंजीकरण कार्ड / प्रमाण पत्र होना आवश्यक है।'
      },
      {
        en: "At the time of application, the participant must attach their Aadhaar card and Artisan Card/Certificate.",
        hi: 'आवेदन करते समय प्रतिभागी को अपना आधार कार्ड एवं कलाकार कार्ड / प्रमाण पत्र संलग्न करना होगा।'
      }
    ]
  },
  {
    title: 'National Awardee',
    titleHi: 'राष्ट्रीय पुरस्कार प्राप्तकर्ता (National Awardee)',
    body: [
      {
        en: 'Applicants in this category must attach their National Award Certificate and Aadhaar card.',
        hi: 'इस श्रेणी में आवेदन करने वाले प्रतिभागी को अपना राष्ट्रीय पुरस्कार प्रमाण पत्र तथा आधार कार्ड संलग्न करना अनिवार्य है।'
      }
    ]
  },
  {
    title: 'Commercial Shop Through Auction',
    titleHi: 'व्यावसायिक दुकान नीलामी द्वारा (Commercial Shop Through Auction)',
    body: [
      {
        en: 'Applications in this category must be submitted online by 6 November (11:59 PM).',
        hi: 'इस श्रेणी में आवेदन 6 नवम्बर, शाम 23:59 बजे तक ऑनलाइन जमा करना होगा।'
      },
      {
        en: 'Participants must also be present at the auction/bidding process held on 7 and 8 November.',
        hi: 'साथ ही, प्रतिभागी को 7 एवं 8 नवम्बर को आयोजित बोली प्रक्रिया (Auction) में उपस्थित रहना आवश्यक है।'
      }
    ]
  },
  {
    title: 'Brand Promotion',
    titleHi: 'ब्रांड प्रमोशन (Brand Promotion)',
    body: [
      {
        en: 'Any reputed agency/company may apply for a stall to promote its product or brand.',
        hi: 'कोई भी प्रतिष्ठित एजेंसी / कंपनी अपने उत्पाद या ब्रांड के प्रमोशन हेतु स्टॉल के लिए आवेदन कर सकती है।'
      },
      {
        en: 'Small shop/stall: ₹1,00,000. Large shop/stall: ₹1,50,000.',
        hi: 'छोटी दुकान / स्टॉल: ₹1,00,000/-। बड़ी दुकान / स्टॉल: ₹1,50,000/-।'
      },
      {
        en: "The agency/company must attach the Aadhaar and ID card of the owner/manager/representative, along with any business registration certificate.",
        hi: 'एजेंसी / कंपनी को आवेदन के साथ मालिक / मैनेजर / प्रतिनिधि का आधार कार्ड व आईडी कार्ड तथा किसी भी तरह का व्यावसायिक पंजीकरण प्रमाण पत्र संलग्न करना आवश्यक है।'
      }
    ]
  },
  {
    title: 'Shop Through Lucky Draw',
    titleHi: 'दुकान लकी ड्रॉ द्वारा (Shop Through Lucky Draw)',
    body: [
      {
        en: "Applicants in this category must attach their Aadhaar card and any registration or PAN registration certificate for their shop/firm/agency.",
        hi: 'इस श्रेणी में आवेदन करने वाले प्रतिभागी को अपना आधार कार्ड तथा दुकान / फर्म / एजेंसी का कोई भी पंजीकरण अथवा पैन पंजीकरण प्रमाण पत्र संलग्न करना होगा।'
      }
    ]
  }
]

const ADDITIONAL_GUIDELINES: Array<{ en: string; hi: string }> = [
  {
    en: 'Before participating in the bidding/auction process for a shop/stall under Refreshment Stall Through Auction or Commercial Shop Through Auction, participants must deposit the prescribed Earnest Money Deposit (EMD) for their respective category. Failure to deposit the EMD will result in disqualification, and the participant will not be permitted to take part in the bidding/auction process.',
    hi: 'Refreshment Stall Through Auction और Shop Through Auction "Commercial" श्रेणी की दुकान / स्टॉल की बोली / नीलामी प्रक्रिया में भाग लेने से पूर्व, प्रतिभागी को संबंधित श्रेणी के अनुसार निर्धारित बयाना राशि (Earnest Money Deposit - EMD) जमा करवाना अनिवार्य है। बयाना राशि जमा न करने की स्थिति में प्रतिभागी को अयोग्य (Disqualified) माना जाएगा तथा उसे बोली / नीलामी प्रक्रिया में भाग लेने की अनुमति नहीं दी जाएगी।'
  },
  {
    en: 'All interested participants are advised to check the location of available stalls around Brahma Sarovar, along with their serial numbers, on the displayed map before applying for a shop/stall.',
    hi: 'सभी इच्छुक प्रतिभागियों को सलाह दी जाती है कि दुकान / स्टॉल हेतु आवेदन करने से पूर्व ब्रह्मसरोवर के चारों ओर उपलब्ध स्टॉल की लोकेशन को उसके क्रमांक (Serial Number) सहित प्रदर्शित मानचित्र पर अवश्य देख लें।'
  },
  {
    en: 'Fees for shops/stalls already allotted under Lucky Draw, Brand Promotion, or any other category will not be refunded under any circumstances. Participants whose names do not come up in the draw will have their amount refunded within one month.',
    hi: 'लकी ड्रॉ व ब्रांड प्रमोशन अथवा किसी भी श्रेणी में आवंटित हो चुकी दुकानों / स्टॉलों की फीस किसी भी परिस्थिति में वापस या रिफंड नहीं की जाएगी। जिन प्रतिभागियों का नाम ड्रॉ में नहीं आएगा, उनकी राशि एक माह के भीतर वापस कर दी जाएगी।'
  },
  {
    en: 'Shops/stalls under Social Organisation (NGO), Artisan (Card Holder), National Awardee, and Shop Through Lucky Draw will be selected through a lucky draw process.',
    hi: 'Social Organisation (NGO), Artisan (Card Holder), National Awardee एवं Shop Through Lucky Draw श्रेणी की दुकानों / स्टॉलों का चयन लकी ड्रॉ प्रक्रिया के माध्यम से किया जाएगा।'
  },
  {
    en: 'Shops/stalls under Refreshment Stall and Commercial Shop Through Auction will be selected through the auction process.',
    hi: 'Refreshment Stall एवं Commercial Shop Through Auction श्रेणी की दुकानों / स्टॉलों का चयन नीलामी प्रक्रिया (Auction Process) द्वारा किया जाएगा।'
  },
  {
    en: 'The number of stalls available for Brand Promotion is limited. Allotment in this category will be on a First Come, First Serve basis.',
    hi: 'ब्रांड प्रमोशन हेतु स्टॉलों की संख्या सीमित है। इस श्रेणी में आवंटन पहले आओ, पहले पाओ (First Come, First Serve) के आधार पर किया जाएगा।'
  },
  {
    en: 'All participants are advised to submit their application online before the last date. No offline or by-hand application will be accepted after the last date.',
    hi: 'सभी प्रतिभागियों को सलाह दी जाती है कि वे अंतिम तिथि से पूर्व अपना आवेदन ऑनलाइन सबमिट करें। अंतिम तिथि के बाद किसी भी प्रकार का ऑफलाइन या By Hand आवेदन स्वीकार नहीं किया जाएगा।'
  },
  {
    en: 'Shops/stalls allotted through auction will be determined during the bidding process itself, while the list of shops/stalls selected through lucky draw will be published on this online platform.',
    hi: 'नीलामी द्वारा की जाने वाली दुकानों / स्टॉलों का निर्धारण बोली प्रक्रिया के दौरान ही किया जाएगा। जबकि लकी ड्रॉ द्वारा चयनित दुकानों / स्टॉलों की सूची इसी ऑनलाइन प्लेटफ़ॉर्म पर प्रकाशित की जाएगी।'
  },
  {
    en: 'The Refreshment Stall Through Auction bidding will be held on 7 November at 1:00 PM, and the Shop Through Auction "Commercial" bidding will be held on 8 November at 1:00 PM, at Shri Krishna Museum, Thanesar, Kurukshetra.',
    hi: 'Refreshment Stall Through Auction की बोली दिनांक 07-11 को दोपहर 01:00 बजे व Shop Through Auction "Commercial" की बोली 08-11 को दोपहर 01:00 बजे, श्री कृष्ण संग्रहालय, थानेसर, कुरुक्षेत्र में आयोजित की जाएगी।'
  },
  {
    en: 'The last date to apply for the Shop Through Auction "Commercial" category has been extended from 7 November to 10 November (11:59 PM), and the auction for this category will be held on 11 November at 11:00 AM, at Shri Krishna Museum, Thanesar, Kurukshetra.',
    hi: 'Shop Through Auction "Commercial" कैटेगरी में आवेदन करने की समय सीमा को 07-11 से बढ़ाकर 10-11 रात 11:59 बजे तक किया जा रहा है व इस कैटेगरी में बोली / Auction 11-11 को सुबह 11:00 बजे, श्री कृष्ण संग्रहालय, थानेसर, कुरुक्षेत्र में आयोजित की जाएगी।'
  },
  {
    en: 'For the Refreshments Stall Through Auction category, participants must deposit the outstanding stall allotment amount into the Kurukshetra Development Board bank account and upload the receipt in the Auction Payment section.',
    hi: 'Refreshments Stall Through Auction कैटेगरी के अंतर्गत स्टॉल एलॉटमेंट की बकाया राशि को, प्रतिभागी कुरुक्षेत्र विकास बोर्ड के बैंक खाते में जमा करवा कर, उसकी रसीद को, Auction Payment वाले सेक्शन में जाकर अपलोड करें।'
  }
]

const GuidelinesView = () => {
  const { lang } = useLanguage()

  return (
    <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6'>
      <div className='mb-10 text-center'>
        <p className='mb-2 text-xs font-extrabold tracking-widest text-[var(--kdb-saffron)] uppercase'>
          {lang === 'hi' ? 'आधिकारिक दिशा-निर्देश' : 'Official Guidelines'}
        </p>
        <h1 className='mb-3 text-3xl sm:text-4xl font-extrabold text-[var(--kdb-primary)]'>
          {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Gita Jayanti Mahotsav 2026'}
        </h1>
        <p className='text-base text-[var(--kdb-muted)]'>
          {lang === 'hi' ? 'आवश्यक दिशा-निर्देश एवं दस्तावेज' : 'Essential Guidelines and Documents'}
        </p>
      </div>

      <div className='flex flex-col gap-6'>
        {CATEGORIES.map((cat, idx) => (
          <div key={cat.title} className='rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-xs'>
            <h2 className='mb-3 flex items-center gap-3 text-lg sm:text-xl font-extrabold text-[#0c2847]'>
              <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fdfbf7] border-2 border-[#e6cca4] text-sm font-bold text-[#8c5711]'>
                {idx + 1}
              </span>
              {lang === 'hi' ? cat.titleHi : cat.title}
            </h2>
            <ul className='flex flex-col gap-2.5 pl-11 text-base leading-relaxed text-[#334155]'>
              {cat.body.map((line, i) => (
                <li key={i} className='list-disc marker:text-[#b8761b]'>
                  {lang === 'hi' ? line.hi : line.en}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className='rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-xs'>
          <h2 className='mb-4 text-lg sm:text-xl font-extrabold text-[#0c2847]'>
            {lang === 'hi' ? 'अन्य आवश्यक दिशा-निर्देश' : 'Other Important Guidelines'}
          </h2>
          <ol className='flex flex-col gap-3'>
            {ADDITIONAL_GUIDELINES.map((line, idx) => (
              <li key={idx} className='flex items-baseline gap-3 text-base leading-relaxed text-[#334155]'>
                <span className='shrink-0 font-bold text-[#b8761b]'>{idx + 1}.</span>
                <span>{lang === 'hi' ? line.hi : line.en}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

export default GuidelinesView
