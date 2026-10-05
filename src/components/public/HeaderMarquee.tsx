'use client'

import { useEffect, useState } from 'react'

import { BellIcon, SparklesIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

type NoticeDto = { id: number; text: string; textHi: string | null }

/**
 * Notices are admin-configurable (src/app/(admin)/admin/settings/notices),
 * fetched from /api/notices rather than hardcoded — see migration
 * 0010_notices.sql. Fetched client-side (not server-rendered) since
 * PublicHeader/HeaderMarquee are client components used on every public
 * page; the notices themselves are non-sensitive and safe to fetch after
 * first paint.
 */
export default function HeaderMarquee() {
  const { lang } = useLanguage()
  const [noticeRows, setNoticeRows] = useState<NoticeDto[]>([])

  useEffect(() => {
    let cancelled = false

    fetch('/api/notices')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && Array.isArray(data.notices)) setNoticeRows(data.notices)
      })
      .catch(() => {
        // Silent — an empty marquee is an acceptable degraded state, not
        // worth surfacing an error banner on the homepage for.
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (noticeRows.length === 0) return null

  const notices = noticeRows.map(n => (lang === 'hi' && n.textHi ? n.textHi : n.text))

  return (
    <div className='relative z-50 bg-[#092b52] text-white'>
      <div className='mx-auto flex max-w-7xl items-center px-3 py-1.5 sm:px-6'>
        {/* Left Badge */}
        <div className='flex items-center gap-1.5 shrink-0 rounded-full bg-[#c88718] px-2.5 py-0.5 text-xs font-extrabold tracking-wider text-[#092b52] uppercase shadow-xs mr-3 select-none'>
          <BellIcon className='size-3 stroke-[2.5] animate-pulse' />
          <span>{lang === 'hi' ? 'महत्वपूर्ण सूचना' : 'Important Info'}</span>
        </div>

        {/* Marquee Ticker Track */}
        <div className='relative overflow-hidden w-full flex-1'>
          <div className='marquee-track flex whitespace-nowrap gap-10 hover:[animation-play-state:paused] cursor-default'>
            <div className='flex items-center gap-10 shrink-0 text-sm font-medium text-slate-100'>
              {notices.map((text, idx) => (
                <span key={`notice-1-${idx}`} className='inline-flex items-center gap-2.5'>
                  <SparklesIcon className='size-3.5 text-[#f0b429] shrink-0' />
                  <span>{text}</span>
                </span>
              ))}
            </div>

            {/* Duplicated for seamless continuous looping */}
            <div className='flex items-center gap-10 shrink-0 text-sm font-medium text-slate-100' aria-hidden='true'>
              {notices.map((text, idx) => (
                <span key={`notice-2-${idx}`} className='inline-flex items-center gap-2.5'>
                  <SparklesIcon className='size-3.5 text-[#f0b429] shrink-0' />
                  <span>{text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slim Gradient Separator Border to distinguish marquee from header */}
      <div className='h-[2px] w-full bg-gradient-to-r from-[#c88718] via-[#ffd56b] to-[#c88718] shadow-xs' />
    </div>
  )
}
