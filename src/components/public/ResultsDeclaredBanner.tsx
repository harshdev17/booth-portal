'use client'

import Link from 'next/link'

import { MegaphoneIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

/**
 * Automatic "Results declared" banner — shown the moment any category's
 * draw is marked complete (src/lib/draw/results-declared.ts), no manual
 * publish step. Text is admin-editable (Admin → Results page) but
 * visibility itself is computed server-side and passed in as `show`.
 */
const ResultsDeclaredBanner = ({
  show,
  textEn,
  textHi
}: {
  show: boolean
  textEn: string
  textHi: string
}) => {
  const { lang } = useLanguage()

  if (!show) return null

  return (
    <Link
      href='/result'
      className='flex items-center justify-center gap-2.5 bg-[#b45309] px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-[#92400e] sm:text-base'
    >
      <MegaphoneIcon className='size-4 shrink-0 sm:size-5' />
      <span>{lang === 'hi' ? textHi : textEn}</span>
    </Link>
  )
}

export default ResultsDeclaredBanner
