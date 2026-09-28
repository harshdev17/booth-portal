'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { useLanguage } from '@/context/LanguageContext'

export default function StatusCheckSection() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [appNumber, setAppNumber] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (appNumber.trim()) {
      router.push(`/status?appNo=${encodeURIComponent(appNumber.trim())}`)
    } else {
      router.push('/status')
    }
  }

  return (
    <section id='status-check' className='w-full bg-[#fbfcfd] py-20 px-4 sm:px-6 lg:px-8 border-t border-[#ede5db]/60'>
      <div className='mx-auto max-w-[1200px]'>
        {/* Section Header Left Aligned */}
        <div className='mb-12 text-left'>
          {/* Saffron Label with Official Gold Ornamental Divider Image */}
          <div className='mb-3 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              {lang === 'hi' ? 'आवेदन स्थिति जांच' : 'CHECK APPLICATION STATUS'}
            </span>
            <div className='relative h-3.5 w-32 sm:w-44 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
                priority
              />
            </div>
          </div>

          {/* Main Large Navy Heading */}
          <h2 className='text-3xl sm:text-5xl font-black text-[#0c2847] tracking-tight mb-3'>
            {lang === 'hi' ? (
              <>
                अपने आवेदन की <span className='text-[#d8891d]'>स्थिति जांचें</span>
              </>
            ) : (
              <>
                Check Your <span className='text-[#d8891d]'>Application Status</span>
              </>
            )}
          </h2>

          {/* Description */}
          <p className='max-w-2xl text-sm sm:text-base text-[#526478] leading-relaxed'>
            {lang === 'hi'
              ? 'गीता महोत्सव 2026 के लिए अपने स्टॉल आवेदन की नवीनतम स्थिति देखने के लिए अपना आवेदन क्रमांक दर्ज करें।'
              : 'Enter your application number to view the latest status of your stall application for Gita Mahotsav 2026.'}
          </p>
        </div>

        {/* 1. Top Search Bar Card */}
        <div className='mb-16 rounded-2xl border border-[#e2e8f0] bg-white p-4 sm:p-5 shadow-xs'>
          <form onSubmit={handleSearch} className='flex flex-col sm:flex-row items-center gap-4 w-full'>
            <div className='relative w-full flex-1'>
              <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#64748b]'>
                {/* Document outline icon */}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='5 1 18 22' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='size-5'>
                  <path d='M7 3h10l4 4v14H7z' />
                  <path d='M17 3v5h5M10 13h8M10 17h6' />
                </svg>
              </div>
              <input
                type='text'
                value={appNumber}
                onChange={e => setAppNumber(e.target.value)}
                placeholder={lang === 'hi' ? 'आवेदन क्रमांक दर्ज करें (उदा. KDB-2026-XXXXXX)' : 'Enter Application Number (e.g. KDB-2026-XXXXXX)'}
                className='w-full rounded-xl border border-[#cbd5e1] bg-white py-3.5 pl-12 pr-4 text-sm font-semibold text-[#0c2847] placeholder:text-[#94a3b8] transition focus:border-[#0c2847] focus:outline-hidden focus:ring-1 focus:ring-[#0c2847]'
              />
            </div>

            {/* Solid Dark Navy Button */}
            <button
              type='submit'
              className='w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c2847] px-8 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#06192e] active:scale-[0.98]'
            >
              <span>{lang === 'hi' ? 'स्थिति जांचें' : 'Check Status'}</span>
              <span className='text-base font-bold'>→</span>
            </button>
          </form>
        </div>

        {/* 3. Bottom 4-Step Connected Process Flow */}
        <div className='relative'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 relative'>
            {/* Step 1: 1. Enter Application No. */}
            <div className='relative flex flex-col items-center text-center px-4'>
              {/* Dashed connector line */}
              <div className='hidden lg:flex items-center absolute top-7 left-[65%] w-[70%] z-0 pointer-events-none'>
                <div className='w-full border-t border-dashed border-[#e2a84b]' />
                <span className='text-[10px] text-[#e2a84b] font-black -ml-0.5'>▶</span>
              </div>

              <div className='relative z-10 mb-4 flex size-15 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#1e293b] shadow-2xs'>
                {/* 05-enter-application.svg */}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='5 1 18 22' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='size-7'>
                  <path d='M7 3h10l4 4v14H7z' />
                  <path d='M17 3v5h5M10 14h8M10 18h6' />
                </svg>
              </div>

              <h4 className='text-[15px] font-bold text-[#0c2847] mb-1.5'>
                {lang === 'hi' ? '1. आवेदन क्रमांक दर्ज करें' : '1. Enter Application No.'}
              </h4>
              <p className='text-xs text-[#64748b] leading-relaxed max-w-[210px]'>
                {lang === 'hi'
                  ? 'आवेदन जमा करने के बाद प्राप्त संदर्भ संख्या दर्ज करें।'
                  : 'Enter the application number received after submission.'}
              </p>
            </div>

            {/* Step 2: 2. Click on Check Status */}
            <div className='relative flex flex-col items-center text-center px-4'>
              {/* Dashed connector line */}
              <div className='hidden lg:flex items-center absolute top-7 left-[65%] w-[70%] z-0 pointer-events-none'>
                <div className='w-full border-t border-dashed border-[#e2a84b]' />
                <span className='text-[10px] text-[#e2a84b] font-black -ml-0.5'>▶</span>
              </div>

              <div className='relative z-10 mb-4 flex size-15 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#1e293b] shadow-2xs'>
                {/* 06-check-status-search.svg */}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='9 9 29 29' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='size-7'>
                  <circle cx='21' cy='21' r='10' />
                  <path d='m29 29 7 7M21 16v10M16 21h10' />
                </svg>
              </div>

              <h4 className='text-[15px] font-bold text-[#0c2847] mb-1.5'>
                {lang === 'hi' ? '2. स्थिति जांचें पर क्लिक करें' : '2. Click on Check Status'}
              </h4>
              <p className='text-xs text-[#64748b] leading-relaxed max-w-[210px]'>
                {lang === 'hi'
                  ? 'अपने आवेदन का नवीनतम विवरण तुरंत देखें।'
                  : 'View your latest application details instantly.'}
              </p>
            </div>

            {/* Step 3: 3. View Your Status */}
            <div className='relative flex flex-col items-center text-center px-4'>
              {/* Dashed connector line */}
              <div className='hidden lg:flex items-center absolute top-7 left-[65%] w-[70%] z-0 pointer-events-none'>
                <div className='w-full border-t border-dashed border-[#e2a84b]' />
                <span className='text-[10px] text-[#e2a84b] font-black -ml-0.5'>▶</span>
              </div>

              <div className='relative z-10 mb-4 flex size-15 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#1e293b] shadow-2xs'>
                {/* 07-view-status.svg */}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='5 1 18 22' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='size-7'>
                  <path d='M7 3h10l4 4v14H7z' />
                  <path d='M17 3v5h5M10 13h8M10 17h6' />
                </svg>
              </div>

              <h4 className='text-[15px] font-bold text-[#0c2847] mb-1.5'>
                {lang === 'hi' ? '3. अपनी स्थिति देखें' : '3. View Your Status'}
              </h4>
              <p className='text-xs text-[#64748b] leading-relaxed max-w-[210px]'>
                {lang === 'hi'
                  ? 'स्वीकृति, भुगतान और आगे की प्रक्रिया की जांच करें।'
                  : 'Check approval, payment and further process.'}
              </p>
            </div>

            {/* Step 4: 4. Follow Next Steps */}
            <div className='relative flex flex-col items-center text-center px-4'>
              <div className='relative z-10 mb-4 flex size-15 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#1e293b] shadow-2xs'>
                {/* 08-follow-next-steps.svg */}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='4 4 40 40' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='size-7'>
                  <circle cx='24' cy='24' r='18' />
                  <path d='m15 24 6 6 12-13' />
                </svg>
              </div>

              <h4 className='text-[15px] font-bold text-[#0c2847] mb-1.5'>
                {lang === 'hi' ? '4. अगले चरणों का पालन करें' : '4. Follow Next Steps'}
              </h4>
              <p className='text-xs text-[#64748b] leading-relaxed max-w-[210px]'>
                {lang === 'hi'
                  ? 'यदि आवश्यक हो तो कोई भी लंबित कार्रवाई पूरी करें।'
                  : 'Complete any pending actions if required.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
