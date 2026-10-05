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

/**
 * Finds the access token by scanning this tab's sessionStorage for the entry
 * matching an applicationNumber — for pages that only have the human-facing
 * applicationNumber (e.g. from a URL param) and not the numeric applicationId
 * the storage key above is actually keyed on.
 */
export function findAccessTokenForApplicationNumber(applicationNumber: string): { applicationId: number; accessToken: string } | null {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)

      if (!key?.startsWith('kdb_application_access_')) continue

      const raw = sessionStorage.getItem(key)

      if (!raw) continue

      const parsed = JSON.parse(raw) as { accessToken: string; applicationNumber: string }

      if (parsed.applicationNumber === applicationNumber) {
        const applicationId = Number(key.slice('kdb_application_access_'.length))

        return { applicationId, accessToken: parsed.accessToken }
      }
    }
  } catch {
    // sessionStorage unavailable — caller treats a null return as "no token".
  }

  return null
}
