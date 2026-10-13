'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/context/LanguageContext'

export type Declarations = { informationCorrect: boolean; agreedToTerms: boolean }

/**
 * The two declarations the applicant must tick before moving on to the
 * Review screen (they used to be on the Review screen itself). Wording is the
 * client's: all information must be correct or the application is rejected,
 * and KDB may change the rules so the website should be checked regularly.
 */
const DeclarationCheckboxes = ({
  value,
  onChange
}: {
  value: Declarations
  onChange: (next: Declarations) => void
}) => {
  const { lang } = useLanguage()

  return (
    <section className='rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs sm:p-7'>
      <h2 className='mb-1 text-lg font-black text-[#0c2847]'>{lang === 'hi' ? 'घोषणा' : 'Declaration'}</h2>
      <p className='mb-4 text-sm text-[#64748b]'>
        {lang === 'hi'
          ? 'आगे बढ़ने के लिए दोनों घोषणाओं पर सही का निशान लगाना अनिवार्य है।'
          : 'Please tick both declarations to continue.'}
      </p>
      <div className='flex flex-col gap-3'>
        <label className='flex cursor-pointer items-start gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#fafbfc] p-4 transition hover:bg-[#f8fafc]'>
          <Checkbox
            checked={value.informationCorrect}
            onCheckedChange={v => onChange({ ...value, informationCorrect: Boolean(v) })}
            className='mt-0.5'
          />
          <span className='text-sm leading-relaxed text-[#334155]'>
            {lang === 'hi'
              ? 'मैं घोषणा करता/करती हूँ कि दी गई समस्त जानकारी सही है। यदि कोई जानकारी गलत पाई गई, तो मेरा आवेदन निरस्त कर दिया जाएगा।'
              : 'I declare that all the information provided is correct. If any information is found to be wrong, my application will be rejected.'}
          </span>
        </label>
        <label className='flex cursor-pointer items-start gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#fafbfc] p-4 transition hover:bg-[#f8fafc]'>
          <Checkbox
            checked={value.agreedToTerms}
            onCheckedChange={v => onChange({ ...value, agreedToTerms: Boolean(v) })}
            className='mt-0.5'
          />
          <span className='text-sm leading-relaxed text-[#334155]'>
            {lang === 'hi'
              ? 'मैं समझता/समझती हूँ कि कुरुक्षेत्र विकास बोर्ड (KDB) समय-समय पर नियमों में परिवर्तन कर सकता है, और मैं अद्यतन जानकारी के लिए नियमित रूप से वेबसाइट देखूँगा/देखूँगी।'
              : 'I understand that the Kurukshetra Development Board (KDB) may change the rules from time to time, and I will visit the website regularly for updates.'}
          </span>
        </label>
      </div>
    </section>
  )
}

export default DeclarationCheckboxes
