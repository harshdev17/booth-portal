'use client'

import { ClipboardCheckIcon, CreditCardIcon, FileTextIcon, SearchIcon, StoreIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const HowItWorks = () => {
  const { t } = useLanguage()

  const steps = [
    { title: t('how.step1.title'), description: t('how.step1.desc'), icon: FileTextIcon },
    { title: t('how.step2.title'), description: t('how.step2.desc'), icon: CreditCardIcon },
    { title: t('how.step3.title'), description: t('how.step3.desc'), icon: ClipboardCheckIcon },
    { title: t('how.step4.title'), description: t('how.step4.desc'), icon: SearchIcon },
    { title: t('how.step5.title'), description: t('how.step5.desc'), icon: StoreIcon }
  ]

  return (
    <div className='relative'>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-3 relative'>
        {steps.map((step, index) => {
          const Icon = step.icon

          return (
            <div key={index} className='relative flex flex-col items-center text-center px-2 group'>
              {/* Connecting Dashed Arrow for Desktop */}
              {index < steps.length - 1 && (
                <div className='hidden lg:flex items-center absolute top-7 left-[65%] w-[70%] z-0 pointer-events-none'>
                  <div className='w-full border-t border-dashed border-[#e2a84b]' />
                  <span className='text-[10px] text-[#e2a84b] font-black -ml-0.5'>▶</span>
                </div>
              )}

              {/* Theme Circular Badge with soft golden amber border */}
              <div className='relative z-10 mb-4 flex size-15 items-center justify-center rounded-full border border-[#fbd38d]/80 bg-[#fffaf0] text-[#0c2847] shadow-2xs transition group-hover:scale-105 group-hover:border-[#c88718] group-hover:bg-[#fff5e0]'>
                <Icon className='size-7 stroke-[1.8]' />
              </div>

              <h4 className='mb-1.5 text-[15px] font-bold text-[#0c2847]'>
                {index + 1}. {step.title}
              </h4>
              <p className='max-w-[190px] text-xs text-[#64748b] leading-relaxed'>
                {step.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HowItWorks
