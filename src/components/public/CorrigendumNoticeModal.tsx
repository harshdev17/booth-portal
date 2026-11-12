'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useLanguage } from '@/context/LanguageContext'

// Bump this when a new corrigendum needs to be shown again to visitors who
// already dismissed an earlier one — a new key means localStorage's old
// dismissal no longer matches, so the prompt reappears once for the new
// notice. Never reuse a key already shipped, or returning visitors who
// dismissed that exact notice would never see the next one either.
const DISMISSED_KEY = 'kdb_corrigendum_02_dismissed'

/**
 * One-time popup for Corrigendum Notice-02 (revised schedule), shown right
 * after the language-preference modal is dismissed/chosen — never
 * simultaneously with it. Only the dates that actually changed are shown
 * here, not the full corrigendum text; the PDF notice itself still lives on
 * the Notices page for anyone who wants the complete wording.
 */
const CorrigendumNoticeModal = () => {
  const { lang, showLanguagePrompt } = useLanguage()
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(DISMISSED_KEY) === 'true'

    setDismissed(alreadyDismissed)
  }, [])

  const close = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  // Never stacked with the language prompt — waits for that one to resolve
  // first (same reasoning as its own Coming Soon exclusion: a second
  // blocking popup right on top of the first is just friction).
  if (dismissed || showLanguagePrompt || pathname === '/coming-soon') return null

  const rows =
    lang === 'hi'
      ? [
          { particular: 'सभी कैटेगरी का रिजल्ट घोषित होना', date: '16 नवंबर 2026, सुबह 11:00 बजे' },
          { particular: 'Refreshment & Ice Cream बूथ/स्टॉल की फिजिकल नीलामी', date: '19 नवंबर 2026, सुबह 10:00 बजे' },
          { particular: 'Brand Promotion और Government Department Category के लिए आवेदन की अंतिम तारीख', date: '15 नवंबर 2026, शाम 5:00 बजे' }
        ]
      : [
          { particular: 'Declaration of Results for all categories', date: '16 November 2026 (11:00 AM)' },
          { particular: 'Physical Auction for Refreshment & Ice Cream Booths/Stalls', date: '19 November 2026 (10:00 AM)' },
          { particular: 'Application for Brand Promotion and Govt. Department Category', date: '15 November 2026 (5:00 PM)' }
        ]

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-[#071f3a]/60 px-4 backdrop-blur-sm'>
      <div className='w-full max-w-xl rounded-2xl border border-[#ebe4db] bg-white p-7 shadow-2xl sm:p-9'>
        <p className='mb-1.5 text-center text-sm font-bold tracking-wide text-[#b45309] uppercase'>
          {lang === 'hi' ? 'संशोधन सूचना-02' : 'Corrigendum Notice-02'}
        </p>
        <p className='mb-7 text-center text-2xl font-black text-[#072448]'>
          {lang === 'hi' ? 'संशोधित कार्यक्रम' : 'Revised Schedule'}
        </p>

        <div className='mb-7 overflow-hidden rounded-xl border border-[#e8e2d8]'>
          <table className='w-full text-left text-base'>
            <tbody className='divide-y divide-[#e8e2d8]'>
              {rows.map(row => (
                <tr key={row.particular}>
                  <td className='w-1/2 bg-[#faf7f1] px-4 py-4 align-top text-[15px] font-semibold text-[#44403c]'>
                    {row.particular}
                  </td>
                  <td className='px-4 py-4 align-top text-[15px] font-bold text-[#0c2847]'>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className='mb-7 text-center text-sm text-[#64748b]'>
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
  )
}

export default CorrigendumNoticeModal
