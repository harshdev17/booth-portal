'use client'

import { BellIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const ImportantNoticesWidget = () => {
  const { t } = useLanguage()

  return (
    <div className='rounded-xl border border-[var(--kdb-border)] bg-white p-6'>
      <div className='mb-4 flex items-center gap-3'>
        <div className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fff0cf] text-[#a96d0e]'>
          <BellIcon className='size-5' />
        </div>
        <h3 className='text-lg font-bold text-[var(--kdb-primary)]'>{t('notices.title')}</h3>
      </div>
      <p className='text-sm text-[var(--kdb-muted)]'>
        {t('notices.desc')}
      </p>
    </div>
  )
}

export default ImportantNoticesWidget
