'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AlertCircleIcon, CheckCircle2Icon, CopyIcon, HomeIcon, SearchIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/context/LanguageContext'

type StatusResponse = { categoryName: string; submittedAt: string | null }

/**
 * Finds the access token by scanning this tab's sessionStorage for the
 * entry matching this application number — the storage key is keyed by
 * applicationId, which this page doesn't have directly, only the
 * human-facing applicationNumber from the URL.
 */
function findAccessTokenForApplicationNumber(applicationNumber: string): string | null {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)

      if (!key?.startsWith('kdb_application_access_')) continue

      const raw = sessionStorage.getItem(key)

      if (!raw) continue

      const parsed = JSON.parse(raw) as { accessToken: string; applicationNumber: string }

      if (parsed.applicationNumber === applicationNumber) {
        return parsed.accessToken
      }
    }
  } catch {
    // sessionStorage unavailable — caller treats a null return as "no token".
  }

  return null
}

const SuccessPageView = ({ applicationNumber }: { applicationNumber: string }) => {
  const router = useRouter()
  const { lang } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [details, setDetails] = useState<StatusResponse | null>(null)

  const [accessToken] = useState<string | null>(() => findAccessTokenForApplicationNumber(applicationNumber))
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/applications/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationNumber, accessToken })
        })

        const body = await response.json()

        if (response.ok) setDetails(body)
      } catch {
        setLoadError(
          lang === 'hi'
            ? 'पूर्ण पुष्टिकरण विवरण लोड नहीं हो सका, लेकिन आपका आवेदन सफलतापूर्वक जमा हो गया है।'
            : 'Could not load full confirmation details, but your application was submitted successfully.'
        )
      }
    }

    void loadStatus()
  }, [accessToken, applicationNumber, lang])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(applicationNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Non-fatal — the number remains visible on screen.
    }
  }

  return (
    <div className='min-h-screen bg-[#faf8f5] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center'>
      <div className='w-full max-w-xl text-center'>
        {/* Header with Home Theme Ornamental Divider */}
        <div className='mb-6 flex flex-col items-center'>
          <div className='mb-2 inline-flex items-center gap-3'>
            <span className='text-xs sm:text-sm font-extrabold tracking-wider text-[#d8891d] uppercase shrink-0'>
              अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026
            </span>
            <div className='relative h-3.5 w-28 sm:w-36 shrink-0'>
              <Image
                src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
                alt=''
                fill
                className='object-contain object-left'
                priority
              />
            </div>
          </div>
          <div className='mt-2 inline-flex size-16 items-center justify-center rounded-full bg-[#ecfdf5] border-2 border-[#10b981]/30 shadow-xs'>
            <CheckCircle2Icon className='size-9 text-[#059669]' />
          </div>
        </div>

        <h1 className='text-2xl sm:text-3xl font-black text-[#0c2847] tracking-tight mb-2'>
          {lang === 'hi' ? 'आवेदन सफलतापूर्वक जमा हुआ!' : 'Application Submitted Successfully!'}
        </h1>
        {details?.categoryName ? (
          <p className='mb-6 text-sm text-[#475569]'>
            {lang === 'hi' ? (
              <>
                आपका <strong className='text-[#0c2847]'>{details.categoryName}</strong> हेतु स्टॉल आवंटन पंजीकरण कुरुक्षेत्र विकास बोर्ड को प्राप्त हो गया है।
              </>
            ) : (
              <>
                Your stall allotment registration for <strong className='text-[#0c2847]'>{details.categoryName}</strong> has been received by Kurukshetra Development Board.
              </>
            )}
          </p>
        ) : (
          <p className='mb-6 text-sm text-[#475569]'>
            {lang === 'hi'
              ? 'आपका स्टॉल आवंटन पंजीकरण कुरुक्षेत्र विकास बोर्ड को प्राप्त हो गया है।'
              : 'Your stall allotment registration has been received by Kurukshetra Development Board.'}
          </p>
        )}

        {loadError && (
          <Alert variant='destructive' className='mb-6 text-left rounded-xl'>
            <AlertCircleIcon className='size-4' />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Confirmation Card */}
        <div className='mb-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 sm:p-7 text-left shadow-xs space-y-5'>
          <div>
            <span className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
              {lang === 'hi' ? 'आवेदन संदर्भ क्रमांक' : 'Application Reference Number'}
            </span>
            <div className='mt-1 flex items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#faf8f5] px-4 py-3'>
              <span className='font-mono text-lg sm:text-xl font-extrabold text-[#0c2847] tracking-wide'>{applicationNumber}</span>
              <button
                type='button'
                onClick={copy}
                className='inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-bold text-[#0c2847] hover:bg-[#f1f5f9] transition active:scale-95 shadow-2xs'
              >
                <CopyIcon className='size-3.5' /> {copied ? (lang === 'hi' ? 'कॉपी हो गया!' : 'Copied!') : lang === 'hi' ? 'कॉपी करें' : 'Copy'}
              </button>
            </div>
          </div>

          {accessToken && (
            <div className='border-t border-[#f1f5f9] pt-4'>
              <span className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
                {lang === 'hi' ? 'डिजिटल एक्सेस कोड' : 'Digital Access Code'}
              </span>
              <p className='mt-1 rounded-xl border border-[#fbd38d]/50 bg-[#fffaf0] p-3 font-mono text-xs sm:text-sm font-semibold text-[#8c5208] break-all'>
                {accessToken}
              </p>
              <div className='mt-2 flex items-start gap-2 text-xs text-[#b45309]'>
                <span className='font-bold shrink-0'>{lang === 'hi' ? '⚠️ नोट:' : '⚠️ Note:'}</span>
                <span>
                  {lang === 'hi'
                    ? 'यह कोड इस सत्र में दस्तावेज़ अपलोड/भुगतान हेतु उपयोग होता है। बाद में स्थिति जांचने के लिए इसकी आवश्यकता नहीं है — उसके लिए केवल आपके मोबाइल नंबर पर भेजा गया OTP पर्याप्त है।'
                    : "This code is used for document uploads/payment within this session. You won't need it to check your status later — that only requires an OTP sent to your mobile number."}
                </span>
              </div>
            </div>
          )}

          {details?.submittedAt && (
            <div className='border-t border-[#f1f5f9] pt-3 text-xs text-[#64748b]'>
              {lang === 'hi' ? 'सबमिट किया गया समय: ' : 'Submitted Timestamp: '}
              <span className='font-semibold text-[#334155]'>{new Date(details.submittedAt).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex flex-col-reverse justify-center gap-3 sm:flex-row'>
          <button
            type='button'
            onClick={() => router.push('/')}
            className='inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbd5e1] bg-white px-6 py-3.5 text-sm font-bold text-[#0c2847] hover:bg-[#f8fafc] transition shadow-2xs'
          >
            <HomeIcon className='size-4' />
            <span>{lang === 'hi' ? 'होम पर वापस जाएं' : 'Return to Home'}</span>
          </button>
          <Link
            href='/status'
            className='inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c2847] px-7 py-3.5 text-sm font-bold text-white shadow-xs hover:bg-[#06192e] transition active:scale-[0.98]'
          >
            <SearchIcon className='size-4' />
            <span>{lang === 'hi' ? 'आवेदन स्थिति ट्रैक करें' : 'Track Application Status'}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SuccessPageView
