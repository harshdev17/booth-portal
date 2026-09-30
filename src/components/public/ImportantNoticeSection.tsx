'use client'

import Link from 'next/link'

import { InfoIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

/**
 * "Important Note" — application fee / non-refundable / allotment-process
 * disclaimer, shown right after the Hero section per explicit request, so
 * it's visible before an applicant even opens the form (the same content
 * also appears in the apply form's "Before You Start" panel and the
 * Guidelines page — this is a homepage-level restatement, not a
 * replacement for either).
 */
const ImportantNoticeSection = () => {
  const { lang } = useLanguage()

  const points = [
    {
      en: 'Merely paying the Application Fee does not guarantee the right to a stall/shop.',
      hi: 'Application Fee जमा करने मात्र से स्टॉल/दुकान का अधिकार सुनिश्चित नहीं होता।'
    },
    {
      en: "Allotment will be done as per the respective category's Eligibility, Scrutiny, Draw, Lucky Draw or Auction Process.",
      hi: 'Allotment संबंधित Category की Eligibility, Scrutiny, Draw, Lucky Draw या Auction Process के अनुसार किया जाएगा।'
    },
    {
      en: "All applicants must carefully read the respective category's Rules & Regulations, Payment Terms, and Allotment Conditions.",
      hi: 'सभी आवेदकों को संबंधित Category के Rules & Regulations, Payment Terms एवं Allotment Conditions को ध्यानपूर्वक पढ़ना होगा।'
    }
  ]

  return (
    <section className='border-y border-[#fbd38d]/60 bg-[#fffaf0] px-4 py-10 sm:px-6'>
      <div className='mx-auto max-w-5xl'>
        <div className='mb-4 flex items-center gap-2.5'>
          <InfoIcon className='size-5 shrink-0 text-[#b8761b]' />
          <h2 className='text-lg font-black text-[#0c2847] sm:text-xl'>
            {lang === 'hi' ? 'महत्वपूर्ण सूचना' : 'Important Note'}
          </h2>
        </div>

        <ol className='mb-5 space-y-2 text-sm sm:text-base text-[#475569] leading-relaxed'>
          {points.map((point, idx) => (
            <li key={idx} className='flex items-baseline gap-2'>
              <span className='font-bold text-[#b8761b]'>{idx + 1}.</span>
              <span>{point[lang]}</span>
            </li>
          ))}
        </ol>

        <div className='mb-4 rounded-xl border border-[#eeddb8] bg-white px-4 py-3'>
          <p className='text-sm sm:text-base font-extrabold text-[#0c2847]'>
            {lang === 'hi'
              ? 'आवेदन शुल्क: ₹200 + 18% GST = ₹236/- | नॉन-रिफंडेबल'
              : 'Application Fee: ₹200 + 18% GST = ₹236/- | Non-Refundable'}
          </p>
        </div>

        <p className='mb-3 text-sm sm:text-base text-[#475569] leading-relaxed'>
          <span className='font-bold text-[#0c2847]'>{lang === 'hi' ? 'नोट: ' : 'Note: '}</span>
          {lang === 'hi'
            ? '₹236/- फॉर्म भरने का आवेदन शुल्क है। आवेदन शुल्क जमा करने के बाद संबंधित कैटेगरी के नियमों के अनुसार चयन/दुकान आवंटन प्रक्रिया की जाएगी। चयन होने पर संबंधित कैटेगरी के अनुसार निर्धारित Shop/Stall Amount या Security/Participation Deposit अलग से जमा करना होगा।'
            : '₹236/- is the application fee for filling the form. After the application fee is paid, the selection/shop allotment process will be carried out as per the rules of the respective category. Upon selection, the Shop/Stall Amount or Security/Participation Deposit fixed for the respective category will have to be paid separately.'}
        </p>

        <p className='mb-5 text-sm sm:text-base font-bold text-[#b91c1c] leading-relaxed'>
          <span>{lang === 'hi' ? 'महत्वपूर्ण: ' : 'Important: '}</span>
          {lang === 'hi'
            ? '₹236/- केवल आवेदन शुल्क है और यह किसी भी स्थिति में वापस नहीं किया जाएगा, चाहे आवेदक का चयन हो या न हो अथवा दुकान/स्टॉल आवंटित हो या नहीं।'
            : '₹236/- is only the application fee and will not be refunded under any circumstances, whether or not the applicant is selected or a shop/stall is allotted.'}
        </p>

        <p className='text-sm sm:text-base text-[#475569] leading-relaxed'>
          {lang === 'hi' ? (
            <>
              कृपया आवेदन से पूर्व <Link href='/guidelines' className='font-bold text-[#0c2847] underline hover:text-[#b8761b]'>Regulations, Payment Terms एवं Allotment Conditions</Link> को ध्यानपूर्वक पढ़ें। किसी भी प्रकार की सहायता के लिए कृपया{' '}
              <Link href='#contact' className='font-bold text-[#0c2847] underline hover:text-[#b8761b]'>Helpline</Link> से संपर्क करें।
            </>
          ) : (
            <>
              Please carefully read the{' '}
              <Link href='/guidelines' className='font-bold text-[#0c2847] underline hover:text-[#b8761b]'>
                Regulations, Payment Terms and Allotment Conditions
              </Link>{' '}
              before applying. For any kind of assistance, please contact the{' '}
              <Link href='#contact' className='font-bold text-[#0c2847] underline hover:text-[#b8761b]'>
                Helpline
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </section>
  )
}

export default ImportantNoticeSection
