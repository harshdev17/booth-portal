'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useLanguage } from '@/context/LanguageContext'
import LetterAvailableNotice from '@/components/public/LetterAvailableNotice'
import PaymentPendingNotice from '@/components/public/PaymentPendingNotice'

/**
 * Popup for Corrigendum Notice-02 (revised schedule), shown right after the
 * language-preference modal is dismissed/chosen — never simultaneously with
 * it. Only the dates that actually changed are shown here, not the full
 * corrigendum text; the PDF notice itself still lives on the Notices page
 * for anyone who wants the complete wording.
 *
 * Deliberately NOT remembered in localStorage — per explicit request, this
 * reappears on every homepage load/refresh (not just a visitor's first
 * visit), so it's scoped to '/' only; other pages never show it even within
 * the same session.
 */
const CorrigendumNoticeModal = () => {
  const { lang, showLanguagePrompt } = useLanguage()
  const pathname = usePathname()
  const [closed, setClosed] = useState(false)

  const close = () => setClosed(true)

  // Never stacked with the language prompt — waits for that one to resolve
  // first (same reasoning as its own Coming Soon exclusion: a second
  // blocking popup right on top of the first is just friction).
  if (closed || showLanguagePrompt || pathname !== '/') return null

  // Second, further revision (2026-11-20) — only Govt. Department and
  // Social Organizations categories moved again, so this gets its own small
  // table (different column headers: "Previous Revised" / "Further
  // Revised") shown above the original Revised Schedule table rather than
  // edited into it, since that table's own "Previous"/"Revised" pair still
  // documents the first revision.
  const furtherRevisedRows =
    lang === 'hi'
      ? [
          {
            particular: 'सरकारी विभाग श्रेणी के लिए आवेदन',
            previous: '19 नवंबर 2026 (शाम 5:00 बजे तक)',
            revised: '20 नवंबर 2026 से 25 नवंबर 2026 (रात 11:59 बजे तक)'
          },
          {
            particular: 'पंजीकृत सामाजिक संगठनों की श्रेणी के लिए आवेदन',
            previous: '19 नवंबर 2026 (रात 11:59 बजे तक)',
            revised: '20 नवंबर 2026 से 23 नवंबर 2026 (रात 11:59 बजे तक)'
          }
        ]
      : [
          {
            particular: 'Application for Govt. Department Category',
            previous: '19 November 2026 (5:00 PM)',
            revised: '20 November 2026 to 25 November 2026 (up to 11:59 PM)'
          },
          {
            particular: 'Application for Social Organizations (Registered) Category',
            previous: '19 November 2026 (up to 11:59 PM)',
            revised: '20 November 2026 to 23 November 2026 (up to 11:59 PM)'
          }
        ]

  const rows =
    lang === 'hi'
      ? [
          {
            particular: 'SARAS Category के लिए आवेदन की अंतिम तारीख',
            previous: '10 नवंबर 2026, शाम 5:00 बजे',
            revised: '23 नवंबर 2026, रात 11:59 बजे तक'
          },
          {
            particular: 'Social Organizations (पंजीकृत) Category के लिए आवेदन की अंतिम तारीख',
            previous: '10 नवंबर 2026, शाम 5:00 बजे',
            revised: '19 नवंबर 2026, रात 11:59 बजे तक'
          },
          {
            particular: 'Brand Promotion Category के लिए आवेदन की अंतिम तारीख',
            previous: '15 नवंबर 2026, शाम 5:00 बजे',
            revised: '19 नवंबर 2026, रात 11:59 बजे तक'
          },
          {
            particular: 'Refreshment & Ice Cream Category के लिए आवेदन की अंतिम तारीख',
            previous: '10 नवंबर 2026, शाम 5:00 बजे',
            revised: '16 नवंबर 2026, रात 11:59 बजे'
          },
          {
            particular: 'सभी कैटेगरी का रिजल्ट घोषित होना',
            previous: '12 नवंबर 2026, सुबह 11:00 बजे',
            revised: '16 नवंबर 2026, सुबह 11:00 बजे'
          },
          {
            particular: 'Refreshment & Ice Cream बूथ/स्टॉल की फिजिकल नीलामी',
            previous: '16 नवंबर 2026, सुबह 10:00 बजे',
            revised: '19 नवंबर 2026, सुबह 10:00 बजे'
          },
          {
            particular: 'Government Department Category के लिए आवेदन की अंतिम तारीख',
            previous: '10 नवंबर 2026, शाम 5:00 बजे',
            revised: '19 नवंबर 2026, शाम 5:00 बजे'
          }
        ]
      : [
          {
            particular: 'Application for SARAS Category',
            previous: '10 November 2026 (5:00 PM)',
            revised: '23 November 2026 (up to 11:59 PM)'
          },
          {
            particular: 'Application for Social Organizations (Registered) Category',
            previous: '10 November 2026 (5:00 PM)',
            revised: '19 November 2026 (up to 11:59 PM)'
          },
          {
            particular: 'Application for Brand Promotion Category',
            previous: '15 November 2026 (5:00 PM)',
            revised: '19 November 2026 (up to 11:59 PM)'
          },
          {
            particular: 'Application for Refreshment & Ice Cream Category',
            previous: '10 November 2026 (5:00 PM)',
            revised: '16 November 2026 (11:59 PM)'
          },
          {
            particular: 'Declaration of Results for all categories',
            previous: '12 November 2026 (11:00 AM)',
            revised: '16 November 2026 (11:00 AM)'
          },
          {
            particular: 'Physical Auction for Refreshment & Ice Cream Booths/Stalls',
            previous: '16 November 2026 (10:00 AM)',
            revised: '19 November 2026 (10:00 AM)'
          },
          {
            particular: 'Application for Govt. Department Category',
            previous: '10 November 2026 (5:00 PM)',
            revised: '19 November 2026 (5:00 PM)'
          }
        ]

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[#071f3a]/60 px-4 py-8 backdrop-blur-sm'>
      <div className='flex max-h-full w-full max-w-4xl flex-col rounded-2xl border border-[#ebe4db] bg-white shadow-2xl'>
        <div className='overflow-y-auto p-7 sm:p-9'>
          <p className='mb-1.5 text-center text-sm font-bold tracking-wide text-[#b45309] uppercase'>
            {lang === 'hi' ? 'महत्वपूर्ण सूचना' : 'Important Notice'}
          </p>
          <p className='mb-5 text-center text-2xl font-black text-[#072448]'>
            {lang === 'hi' ? 'संशोधित कार्यक्रम' : 'Revised Schedule'}
          </p>

          <PaymentPendingNotice size='lg' className='mb-3' />
          <LetterAvailableNotice className='mb-7' />

          <p className='mb-2 text-sm font-bold text-[#0c2847]'>
            {lang === 'hi' ? 'आगे संशोधित समय-सारणी' : 'Further Revised Schedule'}
          </p>
          <div className='mb-6 overflow-x-auto rounded-xl border border-[#e8e2d8]'>
            <table className='w-full min-w-[480px] text-left text-base'>
              <thead>
                <tr className='border-b border-[#e8e2d8] bg-[#f3efe6]'>
                  <th className='px-4 py-3 text-xs font-bold tracking-wide text-[#6b5b3a] uppercase'>
                    {lang === 'hi' ? 'श्रेणी' : 'Category'}
                  </th>
                  <th className='px-4 py-3 text-xs font-bold tracking-wide text-[#6b5b3a] uppercase'>
                    {lang === 'hi' ? 'पहले संशोधित समय-सारणी' : 'Previous Revised Schedule'}
                  </th>
                  <th className='px-4 py-3 text-xs font-bold tracking-wide text-[#6b5b3a] uppercase'>
                    {lang === 'hi' ? 'नई संशोधित समय-सारणी' : 'Further Revised Schedule'}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#e8e2d8]'>
                {furtherRevisedRows.map(row => (
                  <tr key={row.particular}>
                    <td className='bg-[#faf7f1] px-4 py-4 align-top text-[14px] font-semibold text-[#44403c]'>
                      {row.particular}
                    </td>
                    <td className='px-4 py-4 align-top text-[14px] font-medium text-[#94a3b8] line-through decoration-[#cbd5e1]'>
                      {row.previous}
                    </td>
                    <td className='px-4 py-4 align-top text-[14px] font-bold text-[#0c2847]'>{row.revised}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className='mb-2 text-sm font-bold text-[#0c2847]'>
            {lang === 'hi' ? 'संशोधित समय-सारणी' : 'Revised Schedule'}
          </p>
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
              {rows.map(row => (
                <tr key={row.particular}>
                  <td className='bg-[#faf7f1] px-4 py-4 align-top text-[14px] font-semibold text-[#44403c]'>
                    {row.particular}
                  </td>
                  <td className='px-4 py-4 align-top text-[14px] font-medium text-[#94a3b8] line-through decoration-[#cbd5e1]'>
                    {row.previous}
                  </td>
                  <td className='px-4 py-4 align-top text-[14px] font-bold text-[#0c2847]'>{row.revised}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className='mb-3 text-center text-sm text-[#64748b]'>
          {lang === 'hi'
            ? 'जिन आवेदकों ने पहले ही अपना आवेदन सफलतापूर्वक जमा कर दिया है, उन्हें दोबारा आवेदन करने की जरूरत नहीं है।'
            : 'Applicants who have already submitted their applications successfully need not apply again.'}
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
