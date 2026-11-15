import type { Language } from '@/context/LanguageContext'

type ErrorBody = { error?: string; requestId?: string } | null

/**
 * Error text for a failed POST /api/applications/status response. A 503
 * (server busy / dependency unavailable) is worded on the client so it
 * follows the visitor's chosen language and always tells them to retry; the
 * short request reference lets support find the matching server log line.
 */
export function statusLookupErrorMessage(status: number, body: ErrorBody, lang: Language, fallback: string): string {
  if (status === 503) {
    const ref = body?.requestId ? ` (Ref: ${body.requestId.slice(0, 8)})` : ''

    return (
      (lang === 'hi'
        ? 'सर्वर अभी व्यस्त है। कृपया 1 मिनट बाद दोबारा प्रयास करें। दोबारा कोड मंगाने पर केवल नया कोड ही मान्य होगा।'
        : 'The server is busy right now. Please try again in a minute. If you request a new code, only the latest code will work.') +
      ref
    )
  }

  return body?.error ?? fallback
}
