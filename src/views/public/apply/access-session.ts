'use client'

/**
 * Carries the applicant's access token between the data-entry page, the
 * Review page, and the Success page within the same browser tab —
 * deliberately NOT via a URL query string (query strings land in server
 * logs, browser history, and the Referer header of any outbound request
 * made from that page) and NOT via a long-lived cookie (this token is
 * scoped to one application, not a general session). sessionStorage is
 * cleared when the tab closes and never leaves the browser.
 *
 * This is a UX-continuity mechanism only, not a security boundary — every
 * API call the review/success pages make still independently sends this
 * token and the server re-verifies it exactly as it does for the
 * data-entry page's calls (see assertOwnsEditableDraft, verifyAccessToken).
 * If sessionStorage is unavailable or empty (new tab, direct link,
 * cleared storage), the page must ask the applicant to re-enter it rather
 * than silently failing — see the Review/Success page implementations.
 */
const storageKey = (applicationId: number) => `kdb_application_access_${applicationId}`

export function storeApplicationAccess(applicationId: number, accessToken: string, applicationNumber: string) {
  try {
    sessionStorage.setItem(storageKey(applicationId), JSON.stringify({ accessToken, applicationNumber }))
  } catch {
    // sessionStorage can throw in private-browsing/storage-restricted
    // contexts — non-fatal, the caller falls back to asking the user to
    // re-enter the access code on the next page.
  }
}

export function readApplicationAccess(applicationId: number): { accessToken: string; applicationNumber: string } | null {
  try {
    const raw = sessionStorage.getItem(storageKey(applicationId))

    if (!raw) return null

    return JSON.parse(raw) as { accessToken: string; applicationNumber: string }
  } catch {
    return null
  }
}

export function clearApplicationAccess(applicationId: number) {
  try {
    sessionStorage.removeItem(storageKey(applicationId))
  } catch {
    // Non-fatal — see above.
  }
}
