import 'server-only'

/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox) server-side verification
 * for the application submission form (ReviewPageView.tsx → finalize).
 *
 * Deliberately a no-op (passes) when RECAPTCHA_SECRET_KEY isn't configured
 * yet — per explicit instruction, the keys are being added later via the
 * server environment, not now, and the form must keep accepting real
 * submissions in the meantime rather than breaking until someone remembers
 * to flip a feature flag. The moment both RECAPTCHA_SECRET_KEY (server) and
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY (client, requires a rebuild — Next.js
 * inlines NEXT_PUBLIC_* at build time, not read at request time like a
 * normal server env var) are set, this starts enforcing automatically.
 */
export async function verifyRecaptcha(token: string | null, remoteIp?: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey) return { ok: true }

  if (!token) {
    return { ok: false, error: 'Please complete the CAPTCHA verification.' }
  }

  try {
    const params = new URLSearchParams({ secret: secretKey, response: token })

    if (remoteIp) params.set('remoteip', remoteIp)

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })

    const body = (await response.json()) as { success: boolean }

    if (!body.success) {
      return { ok: false, error: 'CAPTCHA verification failed. Please try again.' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not verify CAPTCHA right now. Please try again.' }
  }
}
