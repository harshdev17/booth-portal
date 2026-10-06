'use client'

import { useLanguage } from '@/context/LanguageContext'
import { CATEGORY_GUIDELINES } from '@/lib/content/category-guidelines'

const ADDITIONAL_GUIDELINES: Array<{ en: string; hi: string }> = [
  {
    en: 'Document verification always comes first — only verified and eligible applicants are included in any allotment process, whether by direct allotment, draw, auction, or the Brand Promotion tender process.',
    hi: 'सभी Category में पहले दस्तावेजों का सत्यापन किया जाता है — केवल Verified एवं Eligible आवेदकों को ही Allotment Process (Direct Allotment, Draw, Auction, अथवा Brand Promotion Tender प्रक्रिया) में शामिल किया जाएगा।'
  },
  {
    en: 'Wherever eligible applications exceed the available stalls, a transparent Draw of Lots is used to decide the allotment — except Brand Promotion (handled by the Tender-selected agency) and Refreshment Food Stall (handled by auction).',
    hi: 'जहां भी पात्र आवेदन उपलब्ध Stalls से अधिक होते हैं, वहां Transparent Draw of Lots के माध्यम से Allotment तय किया जाता है — Brand Promotion (Tender द्वारा चयनित Agency के माध्यम से) एवं Refreshment Food Stall (Auction के माध्यम से) को छोड़कर।'
  },
  {
    en: 'The Application Fee of ₹236 (₹200 + 18% GST) applies to every category that charges one, and is non-refundable under any circumstances — whether the application is rejected, the applicant is found ineligible, or a stall is not allotted.',
    hi: '₹236 (₹200 + 18% GST) का Application Fee जिन Categories में लागू है, वह हर आवेदक के लिए अनिवार्य है तथा किसी भी परिस्थिति में वापस नहीं किया जाएगा — चाहे आवेदन अस्वीकृत हो, आवेदक अपात्र पाया जाए, या Stall आवंटित न हो।'
  },
  {
    en: 'An allotted stall/booth may never be transferred, sublet, or rented to any other person or entity, in any category.',
    hi: 'किसी भी Category में आवंटित Stall/Booth को किसी अन्य व्यक्ति/संस्था को Transfer, Sublet अथवा Rent नहीं किया जा सकेगा।'
  },
  {
    en: 'KDB or an authorized officer may inspect any stall at any time. False information, forged documents, or misrepresentation of eligibility can lead to cancellation of the application or allotment at any stage.',
    hi: 'KDB अथवा अधिकृत अधिकारी द्वारा समय-समय पर Stall की जाँच/Inspection की जा सकती है। गलत जानकारी, फर्जी दस्तावेज अथवा पात्रता से संबंधित तथ्य छिपाए जाने की स्थिति में आवेदन/आवंटन को किसी भी चरण पर निरस्त किया जा सकता है।'
  },
  {
    en: 'For the Refreshment Food Stall category: the last date to apply is 6 November 2026 (11:59 PM), the auction is on 7 and 8 November 2026, and a successful bidder’s Security Deposit will be refunded, per the prescribed process, before 31 January 2027.',
    hi: 'Refreshment Food Stall Category हेतु: आवेदन की अंतिम तिथि 06 नवंबर 2026 (रात्रि 11:59 बजे), Auction 07 एवं 08 नवंबर 2026 को, तथा Successful Bidder की Security Deposit निर्धारित प्रक्रिया के अनुसार 31 जनवरी 2027 से पहले वापस की जाएगी।'
  },
  {
    en: 'All applications must be submitted online through this portal — no offline or by-hand application will be accepted.',
    hi: 'सभी आवेदन इसी ऑनलाइन पोर्टल के माध्यम से ही जमा करने होंगे — किसी भी प्रकार का ऑफलाइन या By Hand आवेदन स्वीकार नहीं किया जाएगा।'
  },
  {
    en: 'In all matters relating to application, document verification, eligibility, allotment, auction, payment, and security deposit, the decision of the Kurukshetra Development Board (KDB) is final and binding.',
    hi: 'आवेदन, दस्तावेज सत्यापन, पात्रता, Allotment, Auction, भुगतान तथा Security Deposit से संबंधित सभी मामलों में Kurukshetra Development Board (KDB) का निर्णय अंतिम एवं मान्य होगा।'
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
        {CATEGORY_GUIDELINES.map((cat, idx) => (
          <div key={cat.slug} className='rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-xs'>
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
