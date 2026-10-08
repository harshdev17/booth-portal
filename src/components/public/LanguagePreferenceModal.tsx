'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

import { useLanguage } from '@/context/LanguageContext'

/**
 * Shown once, on a visitor's very first load (no cached language choice yet
 * — see LanguageContext.tsx's showLanguagePrompt). The choice is written to
 * localStorage via choosePreferredLanguage, so this never reappears on
 * later visits from the same browser.
 */
const LanguagePreferenceModal = () => {
  const { showLanguagePrompt, choosePreferredLanguage } = useLanguage()
  const pathname = usePathname()

  // The Coming Soon page has its own small हिंदी | English switcher; a blocking
  // language popup there is just friction for visitors who only see that page.
  if (!showLanguagePrompt || pathname === '/coming-soon') return null

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[#071f3a]/60 px-4 backdrop-blur-sm'>
      <div className='w-full max-w-sm rounded-2xl border border-[#ebe4db] bg-white p-7 text-center shadow-2xl'>
        <div className='mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-[#f5d9ad] bg-[#fffaf1]'>
          <Image src='/images/public/logo.webp' alt='' width={32} height={32} className='size-8 object-contain' />
        </div>

        <p className='mb-1 text-lg font-black text-[#072448]'>भाषा चुनें / Choose Language</p>
        <p className='mb-6 text-sm text-[#64748b]'>
          कृपया अपनी पसंदीदा भाषा चुनें। / Please select your preferred language.
        </p>

        <div className='flex flex-col gap-3'>
          <button
            type='button'
            onClick={() => choosePreferredLanguage('hi')}
            className='rounded-xl bg-[#0c2847] px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#06192e] active:scale-[0.98]'
          >
            हिंदी में जारी रखें
          </button>
          <button
            type='button'
            onClick={() => choosePreferredLanguage('en')}
            className='rounded-xl border border-[#d6dfe6] bg-white px-5 py-3 text-base font-bold text-[#092b52] transition hover:border-[#b4c5d5] hover:bg-[#f5f8fb] active:scale-[0.98]'
          >
            Continue in English
          </button>
        </div>
      </div>
    </div>
  )
}

export default LanguagePreferenceModal
