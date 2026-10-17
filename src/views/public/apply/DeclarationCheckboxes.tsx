'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/context/LanguageContext'

export type Declarations = {
  informationCorrect: boolean
  agreedToTerms: boolean
  kdbRights: boolean
  categoryDeclaration: boolean
}

/**
 * The declarations the applicant must tick before moving on to the Review
 * screen: three general ones, plus (for categories that configure one) a
 * category-specific declaration such as "I will sell only packaged food".
 */
const DeclarationCheckboxes = ({
  value,
  onChange,
  categoryDeclaration
}: {
  value: Declarations
  onChange: (next: Declarations) => void

  /** Already language-resolved text, or null when this category has none. */
  categoryDeclaration: string | null
}) => {
  const { lang } = useLanguage()

  const rows: Array<{ key: keyof Declarations; text: string }> = [
    {
      key: 'informationCorrect',
      text:
        lang === 'hi'
          ? 'मैं घोषणा करता/करती हूँ कि मेरे द्वारा दी गई सभी जानकारी सत्य एवं सही है। मैं समझता/समझती हूँ कि कोई भी जानकारी गलत पाए जाने पर मेरा आवेदन निरस्त कर दिया जाएगा।'
          : 'I declare that all the information I have provided is true and correct. I understand that my application will be rejected if any information is found to be false.'
    },
    {
      key: 'agreedToTerms',
      text:
        lang === 'hi'
          ? 'मैं नई जानकारी के लिए इस पोर्टल को नियमित रूप से देखता/देखती रहूँगा/रहूँगी। किसी भी बदलाव की जानकारी रखना मेरी अपनी ज़िम्मेदारी है।'
          : 'I will regularly check this portal for updates and understand that I am responsible for staying informed about any changes.'
    },
    {
      key: 'kdbRights',
      text:
        lang === 'hi'
          ? 'किसी भी आवेदन को किसी भी समय स्वीकार व निरस्त करने का अधिकार कुरुक्षेत्र विकास बोर्ड के पास सुरक्षित है। मैं इस बारें में भविष्य में कोई भी क्लेम नहीं करूँगा।'
          : 'The Kurukshetra Development Board reserves the right to accept or reject any application at any time. I will not make any claim in this regard in the future.'
    },
    ...(categoryDeclaration ? [{ key: 'categoryDeclaration' as const, text: categoryDeclaration }] : [])
  ]

  return (
    <section id='declarations-section' className='rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xs sm:p-7'>
      <h2 className='mb-1 text-lg font-black text-[#0c2847]'>{lang === 'hi' ? 'घोषणा' : 'Declaration'}</h2>
      <p className='mb-4 text-sm text-[#64748b]'>
        {lang === 'hi'
          ? 'आगे बढ़ने के लिए सभी घोषणाओं पर सही का निशान लगाना आवश्यक है।'
          : 'Please tick all the declarations to continue.'}
      </p>
      <div className='flex flex-col gap-3'>
        {rows.map(row => (
          <label
            key={row.key}
            className='flex cursor-pointer items-start gap-3.5 rounded-xl border border-[#e2e8f0] bg-[#fafbfc] p-4 transition hover:bg-[#f8fafc]'
          >
            <Checkbox
              checked={value[row.key]}
              onCheckedChange={v => onChange({ ...value, [row.key]: Boolean(v) })}
              className='mt-0.5'
            />
            <span className='text-sm leading-relaxed text-[#334155]'>{row.text}</span>
          </label>
        ))}
      </div>
    </section>
  )
}

export default DeclarationCheckboxes
