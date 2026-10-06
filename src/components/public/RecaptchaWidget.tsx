'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

const RECAPTCHA_SCRIPT_SRC = (siteKey: string) => `https://www.google.com/recaptcha/api.js?render=${siteKey}`

function loadRecaptchaScript(siteKey: string): Promise<boolean> {
  return new Promise(resolve => {
    if (window.grecaptcha) {
      resolve(true)

      return
    }

    const src = RECAPTCHA_SCRIPT_SRC(siteKey)
    const existing = document.querySelector(`script[src="${src}"]`)

    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))

      return
    }

    const script = document.createElement('script')

    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Google reCAPTCHA v3 — invisible, no checkbox. Loads the v3 script (render=
 * <site-key>, not 'explicit' like v2) and calls grecaptcha.execute() to get
 * a fresh token right before submission, rather than rendering a visible
 * widget at all. v3 requires its OWN site/secret key pair from
 * recaptcha.google.com — the old v2 keys this project used previously do
 * not work here (different API version, different key type). Renders
 * nothing (and the caller treats a null token as "not required") when
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY isn't set.
 *
 * Unlike v2, there's no user interaction/callback — the token has to be
 * fetched on demand (it's short-lived, ~2 minutes), so this component
 * exposes a getToken() escape hatch via a ref-like callback rather than an
 * onChange, and the Review page calls it right before submit.
 */
const RecaptchaWidget = ({ onReady }: { onReady: (getToken: () => Promise<string | null>) => void }) => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  const [loadFailed, setLoadFailed] = useState(false)
  const readyRef = useRef(false)

  useEffect(() => {
    if (!siteKey) return

    let cancelled = false

    void loadRecaptchaScript(siteKey).then(loaded => {
      if (cancelled) return

      if (!loaded || !window.grecaptcha) {
        setLoadFailed(true)

        return
      }

      window.grecaptcha.ready(() => {
        if (cancelled) return
        readyRef.current = true

        onReady(async () => {
          if (!window.grecaptcha) return null

          try {
            return await window.grecaptcha.execute(siteKey, { action: 'submit_application' })
          } catch {
            return null
          }
        })
      })
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onReady identity changing shouldn't re-trigger script load
  }, [siteKey])

  if (!siteKey) return null

  // v3 shows no visible checkbox — only Google's required "protected by
  // reCAPTCHA" badge notice, which their terms require displaying when the
  // visible badge itself is hidden via CSS (not done here; the default
  // bottom-right badge stays visible, so no extra notice is needed). This
  // block only ever shows a load-failure message, otherwise it renders
  // nothing visible.
  return loadFailed ? (
    <p className='text-xs text-red-600'>Could not load CAPTCHA protection. Please check your connection and reload.</p>
  ) : null
}

export default RecaptchaWidget
