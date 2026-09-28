'use client'

import Link from 'next/link'

import { FileSearchIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const StatusCheckWidget = () => {
  const { t } = useLanguage()

  return (
    <div className='rounded-xl border border-[var(--kdb-border)] bg-white p-6'>
      <div className='mb-4 flex items-center gap-3'>
        <div className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[#edf3f9] text-[var(--kdb-primary)]'>
          <FileSearchIcon className='size-5' />
        </div>
        <h3 className='text-lg font-bold text-[var(--kdb-primary)]'>{t('status.title')}</h3>
      </div>
      <p className='mb-5 text-sm text-[var(--kdb-muted)]'>
        {t('status.desc')}
      </p>
      <Link
        href='/status'
        className='inline-flex items-center justify-center rounded-lg bg-[var(--kdb-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--kdb-primary-dark)]'
      >
        {t('status.btn')}
      </Link>
    </div>
  )
}

export default StatusCheckWidget
