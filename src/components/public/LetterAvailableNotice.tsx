'use client'

import { useLanguage } from '@/context/LanguageContext'

/**
 * "Allotment Letter downloadable from 23 Nov 2026" disclaimer — shown on
 * /status and the Corrigendum popup (NOT the allotment-letter page itself,
 * which only needs this one, not the payment-pending one — see
 * PaymentPendingNotice for that separate message).
 */
const LetterAvailableNotice = ({ className = '' }: { className?: string }) => {
  const { lang } = useLanguage()

  return (
    <div className={`rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-red-800 ${className}`}>
      <p className='text-base font-bold leading-relaxed sm:text-lg'>
        {lang === 'hi'
          ? 'आवंटन शुल्क (Allotment Fee) का भुगतान करने वाले आवेदकों का आधिकारिक आवंटन पत्र (Allotment Letter) 23 नवंबर 2026 से डाउनलोड किया जा सकेगा।'
          : 'The official Allotment Letter for applicants who have paid the allotment fee will be available for download starting 23 November 2026.'}
      </p>
    </div>
  )
}

export default LetterAvailableNotice
