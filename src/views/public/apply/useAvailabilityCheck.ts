import { useRef } from 'react'

import type { UseFormSetError, UseFormClearErrors } from 'react-hook-form'

import type { ApplicationFormValues } from '@/views/public/apply/form-values'

type Field = 'mobileNumber' | 'aadhaarNumber' | 'email'

const DUPLICATE_MESSAGE: Record<Field, { en: string; hi: string }> = {
  mobileNumber: {
    en: 'An application already exists with this mobile number.',
    hi: 'इस मोबाइल नंबर से पहले ही एक आवेदन मौजूद है।'
  },
  aadhaarNumber: {
    en: 'An application already exists with this Aadhaar number.',
    hi: 'इस आधार संख्या से पहले ही एक आवेदन मौजूद है।'
  },
  email: {
    en: 'An application already exists with this email address.',
    hi: 'इस ईमेल पते से पहले ही एक आवेदन मौजूद है।'
  }
}

/**
 * On-blur duplicate check for mobile/Aadhaar/email on the first form step —
 * reported live that a duplicate was previously only caught at final submit
 * (after the OTP step), wasting the applicant's time. This is a UX
 * convenience layered on top of the real, authoritative check
 * (hasActiveDuplicateApplication / finalizeApplication's re-check) — it can
 * say "available" here and still be rejected at submit if another
 * application claims the same value in between, which is expected and
 * already handled correctly server-side.
 */
export function useAvailabilityCheck(
  setError: UseFormSetError<ApplicationFormValues>,
  clearErrors: UseFormClearErrors<ApplicationFormValues>,
  lang: 'hi' | 'en',
  applicationId?: number
) {
  // Guards against a stale response for an earlier value overwriting a
  // newer one if the applicant edits the field again before the first
  // check's response arrives.
  const requestIdRef = useRef<Record<Field, number>>({ mobileNumber: 0, aadhaarNumber: 0, email: 0 })

  const check = async (field: Field, value: string, formFieldName: `common.${Field}`) => {
    if (!value) return

    const requestId = ++requestIdRef.current[field]

    try {
      const response = await fetch('/api/applications/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, applicationId })
      })

      if (requestId !== requestIdRef.current[field]) return // superseded by a newer check

      if (!response.ok) return // fail open — the authoritative server-side check still applies at submit

      const body = await response.json()

      if (body.available === false) {
        setError(formFieldName, { type: 'duplicate', message: DUPLICATE_MESSAGE[field][lang] })
      } else {
        clearErrors(formFieldName)
      }
    } catch {
      // Network failure — fail open, same reasoning as a non-OK response.
    }
  }

  return check
}
