'use client'

import { useLanguage } from '@/context/LanguageContext'
import type { CategoryConfigResponse } from '@/views/public/apply/types'

/**
 * Compact "Before You Start" panel — short bullet points, not paragraphs.
 */
const InstructionsStep = ({ config }: { config: CategoryConfigResponse }) => {
  const { lang } = useLanguage()
  const { documents } = config

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-sm text-[var(--kdb-text)]'>
        {lang === 'hi'
          ? 'आवेदन प्रारंभ करने से पूर्व कृपया निम्नलिखित दस्तावेज तैयार रखें:'
          : 'Please keep the following documents ready before starting your application.'}
      </p>

      {documents.length > 0 && (
        <ol className='flex flex-col gap-2 pl-1'>
          {documents.map((doc, idx) => {
            const displayName = lang === 'hi' && doc.labelHi ? doc.labelHi : doc.label

            return (
              <li key={doc.key} className='flex items-baseline gap-2.5 text-sm font-semibold text-[#0c2847]'>
                <span className='font-bold text-[#b8761b]'>{idx + 1}.</span>
                <span>{displayName}</span>
                {!doc.required && (
                  <span className='text-xs font-normal text-[#64748b]'>
                    {lang === 'hi' ? '(वैकल्पिक)' : '(optional)'}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {/* Important Instructions Box (clean without background or border) */}
      <div className='pt-2'>
        <p className='mb-2 text-sm sm:text-[15px] font-extrabold text-[#0c2847]'>
          {lang === 'hi' ? 'महत्वपूर्ण निर्देश (Important Instructions)' : 'Important Instructions'}
        </p>
        <ol className='space-y-1.5 text-xs sm:text-sm text-[#475569] leading-relaxed'>
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
        </ol>
      </div>
    </div>
  )
}

export default InstructionsStep
