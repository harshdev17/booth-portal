import 'server-only'

// v3 has no pass/fail — Google returns a risk score from 0.0 (likely a bot)
// to 1.0 (likely human). 0.5 is Google's own documented default threshold
// for "no special treatment needed"; there's no business-specific number to
// derive this from, so it's used as-is rather than invented.
const MIN_SCORE = 0.5

/**
 * Google reCAPTCHA v3 (invisible, score-based) server-side verification for
 * the application submission form (ReviewPageView.tsx → finalize). v3 keys
 * are a SEPARATE site/secret pair from v2 — the siteverify endpoint is the
 * same URL, but the response additionally carries `score` and `action`,
 * which v2's response never did.
 *
 * Deliberately a no-op (passes) when RECAPTCHA_SECRET_KEY isn't configured —
 * the form must keep accepting real submissions until keys are actually set,
 * rather than breaking. Once RECAPTCHA_SECRET_KEY (server) and
 * NEXT_PUBLIC_RECAPTCHA_SITE_KEY (client, requires a rebuild — Next.js
 * inlines NEXT_PUBLIC_* at build time) are both set, this starts enforcing
 * automatically.
 */
export async function verifyRecaptcha(token: string | null, remoteIp?: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey) return { ok: true }

  if (!token) {
    return { ok: false, error: 'CAPTCHA verification is missing. Please reload the page and try again.' }
  }

  try {
    const params = new URLSearchParams({ secret: secretKey, response: token })

    if (remoteIp) params.set('remoteip', remoteIp)

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })

    const body = (await response.json()) as { success: boolean; score?: number; action?: string }

    if (!body.success) {
      return { ok: false, error: 'CAPTCHA verification failed. Please reload the page and try again.' }
    }

    if (body.action !== 'submit_application') {
      return { ok: false, error: 'CAPTCHA verification failed. Please reload the page and try again.' }
    }

    if (typeof body.score === 'number' && body.score < MIN_SCORE) {
      return { ok: false, error: 'This submission was flagged as suspicious. Please reload the page and try again.' }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not verify CAPTCHA right now. Please try again.' }
  }
}
