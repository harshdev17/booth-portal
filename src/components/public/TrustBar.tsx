'use client'

import { HandshakeIcon, LayoutGridIcon, ScaleIcon, ShieldCheckIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

const TrustBar = ({ categoryCount }: { categoryCount: number }) => {
  const { lang, t } = useLanguage()

  const categoryLabel =
    lang === 'hi'
      ? `${categoryCount} ${t('trust.category')}`
      : `${categoryCount} ${categoryCount === 1 ? 'Category' : 'Categories'}`

  const items = [
    { label: categoryLabel, icon: LayoutGridIcon },
    { label: t('trust.transparent'), icon: ShieldCheckIcon },
    { label: t('trust.equal'), icon: ScaleIcon },
    { label: t('trust.citizen'), icon: HandshakeIcon }
  ]

  return (
    <div className='grid grid-cols-2 gap-6 sm:grid-cols-4'>
      {items.map(item => {
        const Icon = item.icon

        return (
          <div key={item.label} className='flex flex-col items-center gap-2 text-center'>
            <Icon className='size-6 text-[var(--kdb-secondary)]' />
            <p className='text-sm font-bold text-[var(--kdb-primary)]'>{item.label}</p>
          </div>
        )
      })}
    </div>
  )
}

export default TrustBar
