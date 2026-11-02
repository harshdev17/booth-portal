'use client'

/**
 * Carries the applicant's status-check access token across a page refresh
 * on /status, within the same browser tab, for a short window only — per
 * explicit request (2026-11-02) after a reported "refresh sends me back to
 * the application-number form" complaint. Deliberately time-boxed to 5
 * minutes client-side: a public/shared computer left on this page after
 * the applicant walks away should stop offering their status without a
 * fresh OTP, not stay valid for the rest of the browser session.
 *
 * This is a UX-continuity mechanism only, not the security boundary — same
 * principle as access-session.ts's sessionStorage token for the apply
 * flow. GET /api/applications/[id]/status independently re-verifies this
 * exact token server-side on every refresh; a token that's wrong, expired
 * server-side, or has had its application's status_lookup OTP
 * re-verification bypassed is never trusted just because it's present in
 * sessionStorage.
 */
const STORAGE_KEY = 'kdb_status_session'
const TTL_MS = 5 * 60 * 1000

type StoredSession = { applicationId: number; accessToken: string; applicationNumber: string; savedAt: number }

export function storeStatusSession(applicationId: number, accessToken: string, applicationNumber: string) {
  try {
    const payload: StoredSession = { applicationId, accessToken, applicationNumber, savedAt: Date.now() }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // sessionStorage can throw in private-browsing/storage-restricted
    // contexts — non-fatal, the page falls back to asking for the
    // application number again.
  }
}

export function readStatusSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)

    if (!raw) return null

    const parsed = JSON.parse(raw) as StoredSession

    if (Date.now() - parsed.savedAt > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY)

      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearStatusSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal — see above.
  }
}
