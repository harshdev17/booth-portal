import { useRef, useState } from 'react'

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
 *
 * Deliberately does NOT use react-hook-form's setError/clearErrors. Those
 * live in the same `errors` object Zod's schema validation writes to, and
 * with mode: 'onBlur' RHF re-runs the WHOLE schema on every blur — so
 * blurring field B wipes out the duplicate error setError() had set on
 * field A moments earlier (reported live: "ek time pe ek hi error aata hai"
 * — blur email, see its duplicate error, then blur mobile and the email
 * error vanishes even though the email is still a duplicate). Tracking
 * duplicate state in its own React state here, independent of RHF's error
 * object, means one field's async duplicate check can never be clobbered by
 * another field's synchronous Zod revalidation.
 */
export function useAvailabilityCheck(lang: 'hi' | 'en', applicationId?: number) {
  const [duplicateFields, setDuplicateFields] = useState<Partial<Record<Field, string>>>({})

  // Guards against a stale response for an earlier value overwriting a
  // newer one if the applicant edits the field again before the first
  // check's response arrives.
  const requestIdRef = useRef<Record<Field, number>>({ mobileNumber: 0, aadhaarNumber: 0, email: 0 })

  const check = async (field: Field, value: string) => {
    if (!value) {
      setDuplicateFields(prev => {
        if (!(field in prev)) return prev

        const next = { ...prev }

        delete next[field]

        return next
      })

      return
    }

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

      setDuplicateFields(prev => {
        if (body.available === false) {
          return { ...prev, [field]: DUPLICATE_MESSAGE[field][lang] }
        }

        if (!(field in prev)) return prev

        const next = { ...prev }

        delete next[field]

        return next
      })
    } catch {
      // Network failure — fail open, same reasoning as a non-OK response.
    }
  }

  return { duplicateFields, check }
}
