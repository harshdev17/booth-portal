'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import { AlertCircleIcon, DownloadIcon, Loader2Icon, PrinterIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/context/LanguageContext'
import { downloadBlob } from '@/lib/browser/download-blob'
import ApplicationPrintSheet, { type PrintResult } from '@/views/public/print-application/ApplicationPrintSheet'
import { findAccessTokenForApplicationNumber } from '@/views/public/apply/access-session'

/**
 * No-OTP application print/download for an applicant's own just-submitted
 * application — same session-scoped access-token ownership model as
 * ReceiptPageView. Reachable only from the Success page's "Print
 * Application" button within the same browser tab; the OTP-gated
 * /print-application lookup tool is kept separately for a LATER return
 * visit where no access token is available (reported live: having to
 * verify OTP again seconds after submitting was pure friction since
 * ownership is already proven by the token this page already holds).
 */
const PrintPageView = ({ applicationNumber }: { applicationNumber: string }) => {
  const router = useRouter()
  const { lang } = useLanguage()
  const [result, setResult] = useState<PrintResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    const loadResult = async () => {
      const access = findAccessTokenForApplicationNumber(applicationNumber)

      if (!access) {
        setError(
          lang === 'hi'
            ? 'यह प्रिंट दृश्य केवल उसी ब्राउज़र टैब में उपलब्ध है जहां आवेदन जमा किया गया था।'
            : 'This print view is only available in the same browser tab where the application was submitted.'
        )
        setIsLoading(false)

        return
      }

      try {
        const response = await fetch(`/api/applications/${access.applicationId}/print`, {
          headers: { Authorization: `Bearer ${access.accessToken}` }
        })

        const body = await response.json()

        if (!response.ok) {
          setError(body.error ?? (lang === 'hi' ? 'आवेदन उपलब्ध नहीं है।' : 'Application is not available.'))

          return
        }

        setResult(body)
      } catch {
        setError(
          lang === 'hi' ? 'सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Could not reach the server. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadResult()
  }, [applicationNumber, lang])

  const downloadPdf = async () => {
    const access = findAccessTokenForApplicationNumber(applicationNumber)

    if (!access) return

    setDownloadError(null)
    setIsDownloading(true)

    try {
      const response = await fetch(`/api/applications/${access.applicationId}/print/pdf?lang=${lang}`, {
        headers: { Authorization: `Bearer ${access.accessToken}` }
      })

      if (!response.ok) {
        setDownloadError(
          lang === 'hi'
            ? 'पीडीएफ डाउनलोड नहीं हो सकी। कृपया पुनः प्रयास करें, या इसके बजाय ऊपर दिए गए "प्रिंट करें" बटन का उपयोग करें।'
            : 'Could not download the PDF. Please try again, or use the "Print" button above instead.'
        )

        return
      }

      downloadBlob(await response.blob(), `Application-${applicationNumber}.pdf`)
    } catch {
      setDownloadError(
        lang === 'hi'
          ? 'पीडीएफ डाउनलोड नहीं हो सकी। कृपया पुनः प्रयास करें, या इसके बजाय "प्रिंट करें" बटन का उपयोग करें।'
          : 'Could not download the PDF. Please try again, or use the "Print" button instead.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  useEffect(() => {
    if (!result) return

    const previousTitle = document.title

    document.title = `Application-${result.applicationNumber}`

    return () => {
      document.title = previousTitle
    }
  }, [result])

  return (
    <div className='kdb-print-sheet-page mx-auto max-w-2xl px-4 py-16 sm:px-6 print:max-w-none print:p-0'>
      <div className='print:hidden'>
        <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)]'>
          {lang === 'hi' ? 'आवेदन प्रिंट करें' : 'Print Application'}
        </h1>
        <p className='mb-8 text-[var(--kdb-muted)]'>
          {lang === 'hi' ? 'आपके आवेदन का सारांश।' : 'A summary of your application.'}
        </p>
      </div>

      {isLoading && (
        <div className='flex items-center justify-center gap-2 py-12 text-sm text-[var(--kdb-muted)]'>
          <Loader2Icon className='size-4 animate-spin' />
          <span>{lang === 'hi' ? 'आवेदन लोड हो रहा है...' : 'Loading application...'}</span>
        </div>
      )}

      {!isLoading && error && (
        <Alert variant='destructive'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && downloadError && (
        <Alert variant='destructive' className='mb-4'>
          <AlertCircleIcon className='size-4' />
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      {!isLoading && result && (
        <div className='flex flex-col gap-6 print:block print:gap-0'>
          <div className='flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center print:hidden'>
            <button
              type='button'
              onClick={() => window.print()}
              className='inline-flex items-center justify-center gap-2 rounded-lg bg-[#0c2847] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#06192e]'
            >
              <PrinterIcon className='size-4' />
              {lang === 'hi' ? 'प्रिंट करें' : 'Print'}
            </button>
            <button
              type='button'
              onClick={downloadPdf}
              disabled={isDownloading}
              className='inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-5 py-2.5 text-sm font-semibold text-[#0c2847] transition hover:border-[#0c2847] hover:bg-[#f8fafc] disabled:pointer-events-none disabled:opacity-60'
            >
              {isDownloading ? <Loader2Icon className='size-4 animate-spin' /> : <DownloadIcon className='size-4' />}
              {lang === 'hi' ? 'पीडीएफ डाउनलोड करें' : 'Download PDF'}
            </button>
          </div>

          <ApplicationPrintSheet result={result} lang={lang} />

          <button
            type='button'
            onClick={() => router.push('/')}
            className='mx-auto text-sm text-[var(--kdb-muted)] underline underline-offset-2 hover:text-[var(--kdb-primary)] print:hidden'
          >
            {lang === 'hi' ? 'होम पर वापस जाएं' : 'Return to Home'}
          </button>
        </div>
      )}
    </div>
  )
}

export default PrintPageView
