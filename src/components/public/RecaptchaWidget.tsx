'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }
      ) => number
      reset: (widgetId?: number) => void
    }
  }
}

const RECAPTCHA_SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit'

function loadRecaptchaScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.grecaptcha) {
      resolve(true)

      return
    }

    const existing = document.querySelector(`script[src="${RECAPTCHA_SCRIPT_SRC}"]`)

    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))

      return
    }

    const script = document.createElement('script')

    script.src = RECAPTCHA_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox) on the application Review
 * page, right above Submit. Renders nothing if NEXT_PUBLIC_RECAPTCHA_SITE_KEY
 * isn't set (keys are being added later via the server environment, not
 * now — see .ai/OPEN_QUESTIONS.md) rather than showing a broken widget.
 * Server-side verification (verifyRecaptcha(), called from the finalize
 * route) is the real gate — same "UI convenience, never the security
 * boundary" pattern as the rest of this page's declaration checkboxes.
 */
const RecaptchaWidget = ({ onChange }: { onChange: (token: string | null) => void }) => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false

    void loadRecaptchaScript().then(loaded => {
      if (cancelled || !loaded || !window.grecaptcha || !containerRef.current) {
        if (!cancelled && !loaded) setLoadFailed(true)

        return
      }

      window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: token => onChange(token),
        'expired-callback': () => onChange(null)
      })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renders once; onChange identity changing shouldn't re-render the widget
  }, [siteKey])

  if (!siteKey) return null

  return (
    <div>
      <div ref={containerRef} />
      {loadFailed && <p className='mt-2 text-xs text-red-600'>Could not load CAPTCHA. Please check your connection and reload.</p>}
    </div>
  )
}

export default RecaptchaWidget
