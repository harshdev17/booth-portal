/**
 * Standard "payment deducted but still shows Pending" disclaimer, exact
 * wording given by the client (Hindi only — not translated, per how it was
 * supplied). Shown identically on the Corrigendum popup, /status, and the
 * allotment-letter page so applicants see the same guidance everywhere they
 * might worry about a pending payment.
 */
const PaymentPendingNotice = ({
  className = '',
  size = 'md'
}: {
  className?: string
  /** 'lg' = bold red/urgent styling for the Corrigendum popup's top banner; 'md' = the standard amber inline notice used elsewhere. */
  size?: 'md' | 'lg'
}) => {
  if (size === 'lg') {
    return (
      <div className={`rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-red-800 ${className}`}>
        <p className='text-base font-bold leading-relaxed sm:text-lg'>
          यदि आपकी पेमेंट सफल होने के बाद बैंक खाते से पैसे कट गए हैं, लेकिन पोर्टल पर अभी भी Pending Payment दिखा रहा है,
          तो कृपया 24 घंटे प्रतीक्षा करें। आपकी पेमेंट सफलतापूर्वक अपडेट हो जाएगी।
        </p>
        <p className='mt-2 text-sm font-semibold leading-relaxed sm:text-base'>
          कृपया धैर्य बनाए रखें व दोबारा पेमेंट न करें। आपके सहयोग के लिए धन्यवाद।
        </p>
        <p className='mt-2 text-sm font-bold sm:text-base'>
          धन्यवाद!
          <br />
          कुरुक्षेत्र डेवलपमेंट बोर्ड
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 ${className}`}>
      <p className='leading-relaxed'>
        यदि आपकी पेमेंट सफल होने के बाद बैंक खाते से पैसे कट गए हैं, लेकिन पोर्टल पर अभी भी Pending Payment दिखा रहा है, तो
        कृपया 24 घंटे प्रतीक्षा करें। आपकी पेमेंट सफलतापूर्वक अपडेट हो जाएगी।
      </p>
      <p className='mt-2 leading-relaxed'>कृपया धैर्य बनाए रखें व दोबारा पेमेंट न करें। आपके सहयोग के लिए धन्यवाद।</p>
      <p className='mt-2 font-semibold'>
        धन्यवाद!
        <br />
        कुरुक्षेत्र डेवलपमेंट बोर्ड
      </p>
    </div>
  )
}

export default PaymentPendingNotice
