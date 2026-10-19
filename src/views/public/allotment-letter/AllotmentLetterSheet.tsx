'use client'

import Image from 'next/image'

export type AllotmentData = {
  applicationNumber: string
  representativeName: string
  organisationName?: string | null
  mobileNumber?: string | null
  email?: string | null
  categoryName: string
  categoryNameHi?: string | null
  stallNumber: string
  allotmentAmountPaise?: number | null
  allotmentPaidAt?: string | null
  submittedAt?: string | null
}

const AllotmentLetterSheet = ({ data, lang }: { data: AllotmentData; lang: 'en' | 'hi' }) => {
  const isHi = lang === 'hi'

  return (
    <div className='kdb-print-sheet relative mx-auto w-full max-w-3xl overflow-hidden border border-slate-300 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none'>
      {/* Background Watermark */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 flex items-center justify-center'
      >
        <div className='relative size-80 opacity-[0.08]'>
          <Image src='/images/public/logo.webp' alt='' fill className='object-contain' />
        </div>
      </div>

      {/* Official Header */}
      <div className='relative mb-6 flex items-center gap-4 border-b-2 border-black pb-4'>
        <div className='relative size-16 shrink-0'>
          <Image src='/images/public/logo.webp' alt='KDB Logo' fill className='object-contain' />
        </div>
        <div>
          <h1 className='text-lg font-extrabold text-black tracking-tight'>
            {isHi ? 'कुरुक्षेत्र विकास बोर्ड, कुरुक्षेत्र (हरियाणा)' : 'KURUKSHETRA DEVELOPMENT BOARD, KURUKSHETRA'}
          </h1>
          <h2 className='text-sm font-bold text-black'>
            {isHi ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}
          </h2>
          <p className='text-xs text-black/80'>
            {isHi ? 'बूथ / स्टॉल आवंटन पत्र (आधिकारिक रिकॉर्ड)' : 'Official Booth / Stall Allotment Order'}
          </p>
        </div>
      </div>

      {/* Reference & Date */}
      <div className='mb-6 flex items-center justify-between text-xs border-b border-black/20 pb-3'>
        <div>
          <span className='font-bold text-black'>{isHi ? 'संदर्भ संख्या: ' : 'Ref No: '}</span>
          <span className='font-mono font-semibold'>KDB/IGM-2026/ALLOT/{data.applicationNumber}</span>
        </div>
        <div>
          <span className='font-bold text-black'>{isHi ? 'दिनांक: ' : 'Date: '}</span>
          <span className='font-semibold'>{new Date().toLocaleDateString('en-IN')}</span>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className='mb-6 text-center bg-slate-100 border border-slate-300 py-2.5 rounded-sm print:bg-transparent print:border-black'>
        <h3 className='text-base font-extrabold tracking-wide text-black uppercase'>
          {isHi ? 'बूथ / स्टॉल आबंटन पत्र' : 'BOOTH / STALL ALLOTMENT LETTER'}
        </h3>
        <p className='text-xs text-black/70 mt-0.5'>
          {isHi ? 'सफल लॉटरी ड्रॉ / आबंटन के आधार पर जारी' : 'Issued on confirmation of Selection & Fee Payment'}
        </p>
      </div>

      {/* Allottee & Stall Details */}
      <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm'>
        <div className='rounded border border-black/20 p-3.5 bg-slate-50/50 print:bg-transparent'>
          <p className='text-xs font-bold uppercase tracking-wider text-black/60 mb-2'>
            {isHi ? 'आवेदक / आबंटी का विवरण' : 'Allottee Details'}
          </p>
          <dl className='space-y-1.5 text-xs'>
            <div>
              <dt className='font-semibold text-black/70'>{isHi ? 'आवेदन क्रमांक:' : 'Application No:'}</dt>
              <dd className='font-mono font-bold text-black text-sm'>{data.applicationNumber}</dd>
            </div>
            <div>
              <dt className='font-semibold text-black/70'>{isHi ? 'आवेदक का नाम:' : 'Applicant Name:'}</dt>
              <dd className='font-bold text-black'>{data.representativeName}</dd>
            </div>
            {data.organisationName && (
              <div>
                <dt className='font-semibold text-black/70'>{isHi ? 'संस्था / फर्म:' : 'Firm / Organisation:'}</dt>
                <dd className='font-semibold text-black'>{data.organisationName}</dd>
              </div>
            )}
            {data.mobileNumber && (
              <div>
                <dt className='font-semibold text-black/70'>{isHi ? 'मोबाइल नंबर:' : 'Mobile Number:'}</dt>
                <dd className='font-mono font-semibold text-black'>+91 {data.mobileNumber}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className='rounded border-2 border-black p-3.5 bg-amber-50/40 print:bg-transparent'>
          <p className='text-xs font-bold uppercase tracking-wider text-black/70 mb-2'>
            {isHi ? 'आबंटित स्टॉल विवरण' : 'Allotted Stall Details'}
          </p>
          <dl className='space-y-2 text-xs'>
            <div>
              <dt className='font-semibold text-black/70'>{isHi ? 'आबंटित स्टॉल क्रमांक:' : 'Allotted Stall No:'}</dt>
              <dd className='font-mono text-xl font-extrabold text-black'>{data.stallNumber}</dd>
            </div>
            <div>
              <dt className='font-semibold text-black/70'>{isHi ? 'श्रेणी:' : 'Category:'}</dt>
              <dd className='font-bold text-black'>
                {isHi ? (data.categoryNameHi ?? data.categoryName) : data.categoryName}
              </dd>
            </div>
            <div>
              <dt className='font-semibold text-black/70'>{isHi ? 'स्थिति:' : 'Status:'}</dt>
              <dd className='font-bold text-black'>
                {isHi ? 'पुष्टीकृत एवं वैध' : 'Confirmed & Valid'}
              </dd>
            </div>
            {data.allotmentAmountPaise !== null && data.allotmentAmountPaise !== undefined && (
              <div>
                <dt className='font-semibold text-black/70'>{isHi ? 'आबंटन शुल्क:' : 'Allotment Fee Paid:'}</dt>
                <dd className='font-semibold text-black'>
                  ₹{(Number(data.allotmentAmountPaise) / 100).toLocaleString('en-IN')} (सत्यापित / Verified)
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Conditions */}
      <div className='mt-6 border-t border-black/30 pt-4 text-xs text-black'>
        <p className='font-bold mb-1.5'>{isHi ? 'नियम व शर्तें (Terms & Conditions):' : 'Terms & Conditions:'}</p>
        <ul className='list-disc pl-4 space-y-1 text-black/80 leading-relaxed text-[11px]'>
          <li>
            {isHi
              ? 'यह आबंटन पत्र अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के लिए ही मान्य है।'
              : 'This allotment letter is strictly valid only for International Geeta Jayanti Mahotsav 2026.'}
          </li>
          <li>
            {isHi
              ? 'आबंटी को आवंटित स्टॉल में केवल स्वीकृत श्रेणी के उत्पादों/सेवाओं की ही अनुमति होगी।'
              : 'The allottee must use the stall exclusively for products/services approved in the allotted category.'}
          </li>
          <li>
            {isHi
              ? 'स्टॉल किसी अन्य व्यक्ति को उप-किराए (sub-let) पर देना पूर्णतया वर्जित है।'
              : 'Sub-letting, transferring, or selling the allotted booth/stall to any third party is strictly prohibited.'}
          </li>
          <li>
            {isHi
              ? 'कुरुक्षेत्र विकास बोर्ड के पास किसी भी समय नियमों के उल्लंघन पर आबंटन रद्द करने का पूर्ण अधिकार सुरक्षित है।'
              : 'Kurukshetra Development Board reserves the right to cancel allotment at any time in case of guideline violation.'}
          </li>
        </ul>
      </div>

      {/* Signatures & Verification */}
      <div className='mt-10 flex items-end justify-between border-t border-black pt-4 text-xs text-black'>
        <div>
          <p className='text-xs text-black/70'>Generated on: {new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <div className='text-right'>
          <div className='h-10' />
          <p className='font-bold uppercase tracking-wider text-[11px]'>
            {isHi ? 'मुख्य कार्यकारी अधिकारी / अधिकृत हस्ताक्षरकर्ता' : 'Chief Executive Officer / Authorized Signatory'}
          </p>
          <p className='text-[10px] text-black/70'>
            {isHi ? 'कुरुक्षेत्र विकास बोर्ड' : 'Kurukshetra Development Board'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AllotmentLetterSheet
