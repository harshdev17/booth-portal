'use client'

import Link from 'next/link'

import { ChevronRightIcon, LayoutGridIcon, SearchCheckIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const QuickLinksCard = () => {
  const { lang, t } = useLanguage()

  const links = [
    { label: lang === 'hi' ? 'स्टॉल श्रेणियां' : 'Stall Categories', href: '/#categories', icon: LayoutGridIcon },
    { label: lang === 'hi' ? 'आवेदन की स्थिति जांचें' : 'Check Application Status', href: '/status', icon: SearchCheckIcon },
    { label: lang === 'hi' ? 'सामान्य प्रश्न (FAQ)' : 'Frequently Asked Questions (FAQ)', href: '/#faq', icon: ChevronRightIcon }
  ]

  return (
    <div className='rounded-xl border border-[var(--kdb-border)] bg-white p-6'>
      <h3 className='mb-4 text-lg font-bold text-[var(--kdb-primary)]'>{t('quicklinks.title')}</h3>
      <ul className='flex flex-col gap-1'>
        {links.map(link => {
          const Icon = link.icon

          return (
            <li key={link.label}>
              <Link
                href={link.href}
                className='flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-semibold text-[var(--kdb-text)] hover:bg-[var(--kdb-light-bg)]'
              >
                <Icon className='size-4 text-[var(--kdb-primary)]' />
                <span className='flex-1'>{link.label}</span>
                <ChevronRightIcon className='size-4 text-[var(--kdb-muted)]' />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default QuickLinksCard
