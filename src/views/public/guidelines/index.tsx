'use client'

import { useState } from 'react'

import { Playfair_Display } from 'next/font/google'

import { ChevronDownIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'
import { CATEGORY_GUIDELINES, parseGuidelineBullet } from '@/lib/content/category-guidelines'

// Scoped to this page only (not the site-wide font) — a serif display face
// for the category numerals/headings, matching the "official guidelines
// booklet" reference design, without touching the Geist sans used
// everywhere else (see src/app/layout.tsx).
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '800'] })

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
  const [openSlug, setOpenSlug] = useState<string | null>(CATEGORY_GUIDELINES[0]?.slug ?? null)

  return (
    <div className='bg-[#fdf8ef]'>
      <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6'>
        <div className='mb-10 text-center'>
          <div className='mb-4 flex items-center justify-center gap-2' aria-hidden='true'>
            <span className='h-px w-10 bg-[#c88718]/40' />
            <span className='size-1.5 rotate-45 bg-[#c88718]' />
            <span className='h-px w-10 bg-[#c88718]/40' />
          </div>
          <h1 className={`${playfair.className} mb-3 text-3xl font-bold text-[var(--kdb-primary)] sm:text-4xl`}>
            {lang === 'hi' ? (
              'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026'
            ) : (
              <>
                International Gita Jayanti Mahotsav <span className='text-[#c88718]'>2026</span>
              </>
            )}
          </h1>
          <p className='text-base text-[var(--kdb-muted)]'>
            {lang === 'hi' ? 'आवश्यक दिशा-निर्देश एवं दस्तावेज' : 'Essential Guidelines and Documents'}
          </p>
        </div>

        <div className='flex flex-col gap-4'>
          {CATEGORY_GUIDELINES.map((cat, idx) => {
            const isOpen = openSlug === cat.slug
            const number = String(idx + 1).padStart(2, '0')

            return (
              <div key={cat.slug} className='overflow-hidden rounded-2xl border border-[#eaddc0] bg-[#fffbf2]'>
                <button
                  type='button'
                  onClick={() => setOpenSlug(isOpen ? null : cat.slug)}
                  aria-expanded={isOpen}
                  className='flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6'
                >
                  <div className='flex items-center gap-4'>
                    <span className={`${playfair.className} text-3xl text-[#c88718] sm:text-4xl`}>{number}</span>
                    <div>
                      <h2 className='text-base font-extrabold text-[#0c2847] sm:text-lg'>
                        {lang === 'hi' ? cat.titleHi : cat.title}
                      </h2>
                      <p className='text-xs text-[var(--kdb-muted)] sm:text-sm'>
                        {lang === 'hi' ? cat.descriptionHi : cat.description}
                      </p>
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`size-5 shrink-0 text-[#8c5711] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className='grid grid-cols-1 gap-6 border-t border-[#eaddc0] p-6 sm:grid-cols-[220px_1fr] sm:p-8'>
                    <div className='sm:border-r sm:border-[#eaddc0] sm:pr-6'>
                      <span className={`${playfair.className} text-4xl text-[#c88718]`}>{number}</span>
                      <div className='mt-2 mb-3 h-0.5 w-10 bg-[#c88718]' />
                      <h3 className='text-lg font-extrabold text-[#0c2847] sm:text-xl'>
                        {lang === 'hi' ? cat.titleHi : cat.title}
                      </h3>
                      <p className='mt-2 text-sm text-[var(--kdb-muted)]'>
                        {lang === 'hi' ? cat.descriptionHi : cat.description}
                      </p>
                    </div>

                    <div className='flex flex-col'>
                      {cat.body.map((line, i) => {
                        const parsed = parseGuidelineBullet(lang === 'hi' ? line.hi : line.en)

                        return (
                          <div key={i} className={`flex gap-4 py-4 ${i > 0 ? 'border-t border-[#f1e7d2]' : ''}`}>
                            <span className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-[#e6cca4] bg-[#fdfbf7] text-xs font-bold text-[#8c5711]'>
                              {i + 1}
                            </span>
                            <div>
                              {parsed.title && <p className='mb-1 font-bold text-[#0c2847]'>{parsed.title}</p>}
                              <p className='text-sm leading-relaxed text-[#334155]'>{parsed.text}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className='mt-4 rounded-2xl border border-[#eaddc0] bg-[#fffbf2] p-6 sm:p-7'>
          <h2 className='mb-4 text-lg font-extrabold text-[#0c2847] sm:text-xl'>
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
