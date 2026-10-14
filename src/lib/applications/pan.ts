// PAN (Permanent Account Number) format, shared by the form (instant feedback)
// and the server (authoritative check in validate-submission.ts).
//
// 10 characters: 5 letters, 4 digits, 1 letter. The 4th character is the
// holder type and must be one of the types the Income Tax Department issues:
//   P person, C company, H HUF, F firm / LLP, A association of persons,
//   T trust, B body of individuals, L local authority, J artificial juridical
//   person, G government.
// This checks the format only — it cannot confirm the PAN exists or belongs
// to the applicant.

export const PAN_FIELD_KEY = 'pan_number'

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const PAN_HOLDER_TYPES = 'PCHFATBLJG'

/** Trims, upper-cases and drops spaces — what is stored and compared. */
export function normalizePan(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function isValidPan(value: string): boolean {
  const pan = normalizePan(value)

  return PAN_PATTERN.test(pan) && PAN_HOLDER_TYPES.includes(pan[3])
}

export const PAN_ERROR_MESSAGE = 'Enter a valid 10-character PAN, for example ABCPE1234F.'

/**
 * Soft cross-check only (never blocks): for an individual (4th letter P) the
 * 5th letter is the first letter of the holder's surname. Returns true when we
 * can tell it does not match the applicant's name. Names not written in
 * Latin letters, or other holder types, are never flagged.
 */
export function panNameMismatch(pan: string, applicantName: string): boolean {
  const value = normalizePan(pan)

  if (!isValidPan(value) || value[3] !== 'P') return false

  const words = applicantName.trim().split(/\s+/).filter(Boolean)
  const surname = words[words.length - 1]

  if (!surname || !/^[A-Za-z]/.test(surname)) return false

  return surname[0].toUpperCase() !== value[4]
}
