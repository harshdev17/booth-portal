'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useLanguage } from '@/context/LanguageContext'
import LetterAvailableNotice from '@/components/public/LetterAvailableNotice'
import PaymentPendingNotice from '@/components/public/PaymentPendingNotice'
import type { CorrigendumNoticeRow } from '@/lib/homepage/corrigendum-notice'
import type { SiteNoticeBanners } from '@/lib/homepage/site-notice-banners'

type Props = {
  enabled: boolean
  rows: CorrigendumNoticeRow[]
  heading: string
  headingHi: string
  subheading: string
  subheadingHi: string
  footerText: string
  footerTextHi: string
  banners: SiteNoticeBanners
}

/**
 * Popup for the Corrigendum Notice (revised schedule), shown right after the
 * language-preference modal is dismissed/chosen — never simultaneously with
 * it. Only the dates that actually changed are shown here, not the full
 * corrigendum text; the PDF notice itself still lives on the Notices page
 * for anyone who wants the complete wording.
 *
 * `enabled`/`rows` come from the database (corrigendum_notice_settings /
 * corrigendum_notice_rows), fetched once in the public layout (a Server
 * Component) and passed down here — editable from
 * Admin → Settings → Homepage Notices without a code deploy (per explicit
 * request, 2026-11-24). Previously hardcoded in this component.
 *
 * Deliberately NOT remembered in localStorage — per explicit request, this
 * reappears on every homepage load/refresh (not just a visitor's first
 * visit), so it's scoped to '/' only; other pages never show it even within
 * the same session.
 */
const CorrigendumNoticeModal = ({
  enabled,
  rows,
  heading,
  headingHi,
  subheading,
  subheadingHi,
  footerText,
  footerTextHi,
  banners
}: Props) => {
  const { lang, showLanguagePrompt } = useLanguage()
  const pathname = usePathname()
  const [closed, setClosed] = useState(false)

  const close = () => setClosed(true)

  // Never stacked with the language prompt — waits for that one to resolve
  // first (same reasoning as its own Coming Soon exclusion: a second
  // blocking popup right on top of the first is just friction).
  if (closed || showLanguagePrompt || pathname !== '/' || !enabled || rows.length === 0) return null

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[#071f3a]/60 px-4 py-8 backdrop-blur-sm'>
      <div className='flex max-h-full w-full max-w-4xl flex-col rounded-2xl border border-[#ebe4db] bg-white shadow-2xl'>
        <div className='overflow-y-auto p-7 sm:p-9'>
          <p className='mb-1.5 text-center text-sm font-bold tracking-wide text-[#b45309] uppercase'>
            {lang === 'hi' ? headingHi : heading}
          </p>
          <p className='mb-5 text-center text-2xl font-black text-[#072448]'>
            {lang === 'hi' ? subheadingHi : subheading}
          </p>

          {banners.paymentPendingEnabled && (
            <PaymentPendingNotice
              size='lg'
              className='mb-3'
              text={banners.paymentPendingText}
              textHi={banners.paymentPendingTextHi}
            />
          )}
          {banners.letterAvailableEnabled && (
            <LetterAvailableNotice
              className='mb-7'
              text={banners.letterAvailableText}
              textHi={banners.letterAvailableTextHi}
            />
          )}

          <div className='mb-7 overflow-x-auto rounded-xl border border-[#e8e2d8]'>
          <table className='w-full min-w-[480px] text-left text-base'>
            <thead>
              <tr className='border-b border-[#e8e2d8] bg-[#f3efe6]'>
                <th className='px-4 py-3 text-xs font-bold tracking-wide text-[#6b5b3a] uppercase'>
                  {lang === 'hi' ? 'विवरण' : 'Particular'}
                </th>
                <th className='px-4 py-3 text-xs font-bold tracking-wide text-[#6b5b3a] uppercase'>
                  {lang === 'hi' ? 'पूर्व तिथि' : 'Previous'}
                </th>
                <th className='px-4 py-3 text-xs font-bold tracking-wide text-[#6b5b3a] uppercase'>
                  {lang === 'hi' ? 'संशोधित तिथि' : 'Revised'}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#e8e2d8]'>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className='bg-[#faf7f1] px-4 py-4 align-top text-[14px] font-semibold text-[#44403c]'>
                    {lang === 'hi' ? row.particularHi : row.particular}
                  </td>
                  <td className='px-4 py-4 align-top text-[14px] font-medium text-[#94a3b8] line-through decoration-[#cbd5e1]'>
                    {lang === 'hi' ? row.previousHi : row.previous}
                  </td>
                  <td className='px-4 py-4 align-top text-[14px] font-bold text-[#0c2847]'>
                    {lang === 'hi' ? row.revisedHi : row.revised}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className='mb-3 text-center text-sm text-[#64748b]'>
          {lang === 'hi' ? footerTextHi : footerText}
        </p>

        <button
          type='button'
          onClick={close}
          className='w-full rounded-xl bg-[#0c2847] px-5 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-[#06192e] active:scale-[0.98]'
        >
          {lang === 'hi' ? 'समझ गया' : 'Got It'}
        </button>

        <Link
          href='/notifications'
          onClick={close}
          className='mt-4 block text-center text-sm font-bold text-[#0c2847] underline underline-offset-2 hover:text-[#06192e]'
        >
          {lang === 'hi' ? 'पूरी सूचना देखें' : 'View Full Notice'}
        </Link>
        </div>
      </div>
    </div>
  )
}

export default CorrigendumNoticeModal
