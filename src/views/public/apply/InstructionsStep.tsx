'use client'

import { useLanguage } from '@/context/LanguageContext'
import { formatDateTime } from '@/lib/format-date'
import { getApplyInstructions } from '@/lib/content/apply-instructions'
import type { CategoryConfigResponse } from '@/views/public/apply/types'


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
  const applyInstructions = getApplyInstructions(category.slug)

  // Important Dates & Deadlines — admin-configured per category
  // (importantDatesNote/_hi, migration 0068). Previously shown in a
  // separate blue box above this step; merged into this single "Before
  // You Start" schedule box per explicit request (2026-10-29) so dates
  // only appear in one place on the apply form.
  const importantDatesNote = lang === 'hi' ? category.importantDatesNoteHi : category.importantDatesNote
  const importantDatesLines = importantDatesNote
    ? importantDatesNote.split('\n').filter(line => line.trim() !== '')
    : []
  const importantDatesBullets = importantDatesLines
    .filter(line => line.trim().startsWith('•'))
    .map(line => line.trim().replace(/^•\s*/, ''))

  const hasAuctionDetails =
    !getApplyInstructions(category.slug)?.hideScheduleBox &&
    (importantDatesBullets.length > 0 ||
      importantDatesLines.length > 0 ||
      !!(category.applicationOpensAt || category.applicationClosesAt || (category.auctionDate && auctionVenue)))
  const categoryInstructions = applyInstructions?.bullets
  const docOverride = applyInstructions?.requiredDocuments
  const importantOverride = applyInstructions?.importantInstructions

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-base text-[var(--kdb-text)]'>
        {lang === 'hi'
          ? 'आवेदन प्रारंभ करने से पूर्व कृपया निम्नलिखित दस्तावेज तैयार रखें:'
          : 'Please keep the following documents ready before starting your application.'}
      </p>

      {docOverride && docOverride.length > 0 && (
        <ol className='flex flex-col gap-2 pl-1'>
          {docOverride.map((doc, idx) => (
            <li key={idx} className='flex items-baseline gap-2.5 text-base font-semibold text-[#0c2847]'>
              <span className='font-bold text-[#b8761b]'>{idx + 1}.</span>
              <span>{lang === 'hi' ? doc.hi : doc.en}</span>
            </li>
          ))}
        </ol>
      )}

      {!docOverride && documents.length > 0 && (
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

      {applyInstructions?.sections?.map((section, sIdx) => (
        <div key={sIdx} className='pt-2'>
          <p className='mb-2 text-base sm:text-lg font-extrabold text-[#0c2847]'>{section.title[lang === 'hi' ? 'hi' : 'en']}</p>
          {section.intro && (
            <p className='mb-2 text-sm sm:text-base text-[#475569] leading-relaxed'>{section.intro[lang === 'hi' ? 'hi' : 'en']}</p>
          )}
          {section.items && (
            <ul className='mb-2 space-y-1.5 text-sm sm:text-base text-[#475569] leading-relaxed'>
              {section.items.map((item, i) => (
                <li key={i} className='flex items-baseline gap-2'>
                  <span className='font-bold text-[#b8761b]'>•</span>
                  <span>{item[lang === 'hi' ? 'hi' : 'en']}</span>
                </li>
              ))}
            </ul>
          )}
          {section.note && (
            <p className='text-sm sm:text-base text-[#475569] leading-relaxed'>{section.note[lang === 'hi' ? 'hi' : 'en']}</p>
          )}
        </div>
      ))}

      {hasAuctionDetails && (
        <ul className='flex flex-col gap-2 rounded-xl border border-[#fbd38d] bg-[#fffaf0] p-4'>
          {importantDatesBullets.length > 0
            ? importantDatesBullets.map((item, idx) => (
                <li key={idx} className='flex items-baseline gap-2 text-base font-bold text-[#8c5711]'>
                  <span>•</span>
                  <span>{item}</span>
                </li>
              ))
            : importantDatesLines.length > 0
              ? importantDatesLines.map((line, idx) => (
                  <li key={idx} className='flex items-baseline gap-2 text-base font-bold text-[#8c5711]'>
                    <span>•</span>
                    <span>{line.trim()}</span>
                  </li>
                ))
              : (
                <>
                  {category.applicationOpensAt && (
                    <li className='flex items-baseline gap-2 text-base font-bold text-[#8c5711]'>
                      <span>•</span>
                      <span>
                        {lang === 'hi' ? 'आवेदन प्रारंभ तिथि: ' : 'Application start date: '}
                        {formatDateTime(category.applicationOpensAt, lang)}
                      </span>
                    </li>
                  )}
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
                        {category.selectionMethod === 'auction'
                          ? lang === 'hi'
                            ? 'नीलामी की तिथि: '
                            : 'Auction Date: '
                          : lang === 'hi'
                            ? 'ड्रॉ: '
                            : 'Draw: '}
                        {formatDateTime(category.auctionDate, lang)}
                        {' — '}
                        {category.selectionMethod === 'auction' ? (lang === 'hi' ? 'नीलामी का स्थान: ' : 'Auction Venue: ') : ''}
                        {auctionVenue}
                      </span>
                    </li>
                  )}
                </>
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
            {applyInstructions?.bulletsHeading?.[lang === 'hi' ? 'hi' : 'en'] ??
              (lang === 'hi' ? 'आवेदन से पूर्व निर्देश' : 'Before You Apply')}
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
          {lang === 'hi' ? 'महत्वपूर्ण निर्देश' : 'Important Instructions'}
        </p>
        {importantOverride ? (
          <ol className='space-y-1.5 text-sm sm:text-base text-[#475569] leading-relaxed'>
            {importantOverride.map((item, idx) => (
              <li key={idx} className='flex items-baseline gap-2'>
                <span className='font-bold text-[#b8761b]'>{idx + 1}.</span>
                <span>{lang === 'hi' ? item.hi : item.en}</span>
              </li>
            ))}
          </ol>
        ) : (
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
                ? 'केवल चयनित बूथ/स्टॉल श्रेणी के लिए निर्धारित आवश्यक दस्तावेजों का ही सत्यापन किया जाएगा।'
                : 'Only the documents required for your selected booth/stall category will be verified.'}
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
        )}
      </div>
    </div>
  )
}

export default InstructionsStep
