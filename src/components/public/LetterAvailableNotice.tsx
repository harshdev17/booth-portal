'use client'

import { useLanguage } from '@/context/LanguageContext'

/**
 * "Allotment Letter downloadable from 23 Nov 2026" disclaimer — shown on
 * /status and the Corrigendum popup (NOT the allotment-letter page itself,
 * which only needs this one, not the payment-pending one — see
 * PaymentPendingNotice for that separate message).
 */
const LetterAvailableNotice = ({
  className = '',
  text,
  textHi
}: {
  className?: string

  /** Admin-editable (site_notice_banners, migration 0092), fetched by each page and passed down here. */
  text: string
  textHi: string
}) => {
  const { lang } = useLanguage()

  return (
    <div className={`rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-red-800 ${className}`}>
      <p className='text-base font-bold leading-relaxed sm:text-lg'>{lang === 'hi' ? textHi : text}</p>
    </div>
  )
}

export default LetterAvailableNotice
