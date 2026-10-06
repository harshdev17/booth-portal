'use client'

import { useLanguage } from '@/context/LanguageContext'
import { getApplyInstructions } from '@/lib/content/apply-instructions'
import type { CategoryConfigResponse } from '@/views/public/apply/types'

const formatDateTime = (value: string, lang: 'hi' | 'en') => {
  const date = new Date(value)

  return date.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Compact "Before You Start" panel — short bullet points, not paragraphs.
 * The auction date/venue points (highlighted) are admin-configured per
 * category (categories.auction_date / auction_venue) — never hardcoded —
 * and are only shown when actually set, since not every category runs an
 * auction. See migration 0009_category_auction_details.sql.
 */
const InstructionsStep = ({ config }: { config: CategoryConfigResponse }) => {
  const { lang } = useLanguage()
  const { documents, category } = config
  const auctionVenue = lang === 'hi' && category.auctionVenueHi ? category.auctionVenueHi : category.auctionVenue
  const hasAuctionDetails = !!(category.applicationClosesAt || (category.auctionDate && auctionVenue))
  const categoryInstructions = getApplyInstructions(category.slug)?.bullets

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-base text-[var(--kdb-text)]'>
        {lang === 'hi'
          ? 'आवेदन प्रारंभ करने से पूर्व कृपया निम्नलिखित दस्तावेज तैयार रखें:'
          : 'Please keep the following documents ready before starting your application.'}
      </p>

      {documents.length > 0 && (
        <ol className='flex flex-col gap-2 pl-1'>
          {documents.map((doc, idx) => {
            const displayName = lang === 'hi' && doc.labelHi ? doc.labelHi : doc.label

            return (
              <li key={doc.key} className='flex items-baseline gap-2.5 text-base font-semibold text-[#0c2847]'>
                <span className='font-bold text-[#b8761b]'>{idx + 1}.</span>
                <span>{displayName}</span>
                {!doc.required && (
                  <span className='text-sm font-normal text-[#64748b]'>
                    {lang === 'hi' ? '(वैकल्पिक)' : '(optional)'}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {hasAuctionDetails && (
        <ul className='flex flex-col gap-2 rounded-xl border border-[#fbd38d] bg-[#fffaf0] p-4'>
          {category.applicationClosesAt && (
            <li className='flex items-baseline gap-2 text-base font-bold text-[#8c5711]'>
              <span>•</span>
              <span>
                {lang === 'hi' ? 'आवेदन की अंतिम तिथि: ' : 'Last date to apply: '}
                {formatDateTime(category.applicationClosesAt, lang)}
              </span>
            </li>
          )}
          {category.auctionDate && auctionVenue && (
            <li className='flex items-baseline gap-2 text-base font-bold text-[#8c5711]'>
              <span>•</span>
              <span>
                {lang === 'hi' ? 'नीलामी (Auction): ' : 'Auction: '}
                {formatDateTime(category.auctionDate, lang)}
                {' — '}
                {auctionVenue}
              </span>
            </li>
          )}
        </ul>
      )}

      {/* Category-specific "Before You Start" bullets — supplied verbatim
          per category (see apply-instructions.ts), shown ABOVE the generic
          procedural list below rather than replacing it, since the generic
          list's points (final-decision authority, jurisdiction) apply to
          every category and aren't repeated in the category-specific text. */}
      {categoryInstructions && categoryInstructions.length > 0 && (
        <div className='pt-2'>
          <p className='mb-2 text-base sm:text-lg font-extrabold text-[#0c2847]'>
            {lang === 'hi' ? 'आवेदन से पूर्व निर्देश' : 'Before You Apply'}
          </p>
          <ol className='space-y-1.5 text-sm sm:text-base text-[#475569] leading-relaxed'>
            {categoryInstructions.map((bullet, idx) => (
              <li key={idx} className='flex items-baseline gap-2'>
                <span className='font-bold text-[#b8761b]'>{idx + 1}.</span>
                <span>{lang === 'hi' ? bullet.hi : bullet.en}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Important Instructions Box (clean without background or border) */}
      <div className='pt-2'>
        <p className='mb-2 text-base sm:text-lg font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'महत्वपूर्ण निर्देश (Important Instructions)' : 'Important Instructions'}
        </p>
        <ol className='space-y-1.5 text-sm sm:text-base text-[#475569] leading-relaxed'>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>1.</span>
            <span>
              {lang === 'hi'
                ? 'अपना विवरण ठीक वैसा ही दर्ज करें जैसा आपके सरकारी पहचान पत्र / आधार कार्ड में लिखा है।'
                : 'Enter your details exactly as they appear on your government-issued identity documents.'}
            </span>
          </li>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>2.</span>
            <span>
              {lang === 'hi'
                ? 'आवेदन निरस्त होने से बचाने के लिए केवल स्पष्ट और पठनीय दस्तावेज ही अपलोड करें।'
                : 'Upload clear and readable documents to prevent application rejection.'}
            </span>
          </li>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>3.</span>
            <span>
              {lang === 'hi'
                ? 'केवल चयनित स्टॉल श्रेणी के लिए निर्धारित आवश्यक दस्तावेजों का ही सत्यापन किया जाएगा।'
                : 'Only the documents required for your selected stall category will be verified.'}
            </span>
          </li>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>4.</span>
            <span>
              {lang === 'hi'
                ? 'आवेदन पूर्ण होने के बाद संशोधन नहीं किया जा सकता।'
                : 'Once submitted, an application cannot be modified.'}
            </span>
          </li>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>5.</span>
            <span>
              {lang === 'hi'
                ? 'अपूर्ण/गलत जानकारी वाले आवेदन अस्वीकार किए जाएंगे।'
                : 'Applications with incomplete or incorrect information will be rejected.'}
            </span>
          </li>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>6.</span>
            <span>
              {lang === 'hi'
                ? 'किसी भी आवेदन को स्वीकार अथवा अस्वीकार करने का अंतिम निर्णय कुरुक्षेत्र विकास बोर्ड का होगा।'
                : 'The final decision to accept or reject any application rests with the Kurukshetra Development Board.'}
            </span>
          </li>
          <li className='flex items-baseline gap-2'>
            <span className='font-bold text-[#b8761b]'>7.</span>
            <span>
              {lang === 'hi'
                ? 'हर प्रकार के विवाद में कुरुक्षेत्र न्यायालय का क्षेत्राधिकार होगा।'
                : 'All disputes shall be subject to the jurisdiction of the courts at Kurukshetra.'}
            </span>
          </li>
        </ol>
      </div>
    </div>
  )
}

export default InstructionsStep
