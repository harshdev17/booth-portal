'use client'

import { ClockIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const ComingSoonSection = ({ titleEn, titleHi }: { titleEn: string; titleHi: string }) => {
  const { lang } = useLanguage()

  return (
    <div className='mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6'>
      <div className='mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--kdb-light-bg)] text-[var(--kdb-primary)]'>
        <ClockIcon className='size-8' />
      </div>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>{lang === 'hi' ? titleHi : titleEn}</h1>
      <p className='text-[var(--kdb-muted)]'>
        {lang === 'hi' ? 'यह सुविधा जल्द ही उपलब्ध होगी।' : 'This feature will be available soon.'}
      </p>
    </div>
  )
}

export default ComingSoonSection
