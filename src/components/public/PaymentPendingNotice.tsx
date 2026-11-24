'use client'

import { useLanguage } from '@/context/LanguageContext'

/**
 * Standard "payment deducted but still shows Pending" disclaimer, exact
 * wording given by the client (Hindi original, English translation added
 * for parity) — switches with the site's language toggle. Shown identically
 * on the Corrigendum popup, /status, and the allotment-letter page so
 * applicants see the same guidance everywhere they might worry about a
 * pending payment.
 */
const PaymentPendingNotice = ({
  className = '',
  size = 'md',
  text,
  textHi
}: {
  className?: string

  /** 'lg' = bold red/urgent styling for the Corrigendum popup's top banner; 'md' = the standard amber inline notice used elsewhere. */
  size?: 'md' | 'lg'

  /**
   * Main disclaimer text — admin-editable (site_notice_banners, migration
   * 0092), fetched by each page and passed down here. The shorter
   * "patience"/signature lines below stay fixed boilerplate; only the main
   * line (which states the actual wait time/condition) is a business value
   * worth editing without a deploy.
   */
  text: string
  textHi: string
}) => {
  const { lang } = useLanguage()

  const lines =
    lang === 'hi'
      ? {
          main: textHi,
          patience: 'कृपया धैर्य बनाए रखें व दोबारा पेमेंट न करें। आपके सहयोग के लिए धन्यवाद।',
          thanks: 'धन्यवाद!',
          board: 'कुरुक्षेत्र डेवलपमेंट बोर्ड'
        }
      : {
          main: text,
          patience: 'Please be patient and do not make the payment again. Thank you for your cooperation.',
          thanks: 'Thank you!',
          board: 'Kurukshetra Development Board'
        }

  if (size === 'lg') {
    return (
      <div className={`rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-red-800 ${className}`}>
        <p className='text-base font-bold leading-relaxed sm:text-lg'>{lines.main}</p>
        <p className='mt-2 text-sm font-semibold leading-relaxed sm:text-base'>{lines.patience}</p>
        <p className='mt-2 text-sm font-bold sm:text-base'>
          {lines.thanks}
          <br />
          {lines.board}
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 ${className}`}>
      <p className='leading-relaxed'>{lines.main}</p>
      <p className='mt-2 leading-relaxed'>{lines.patience}</p>
      <p className='mt-2 font-semibold'>
        {lines.thanks}
        <br />
        {lines.board}
      </p>
    </div>
  )
}

export default PaymentPendingNotice
