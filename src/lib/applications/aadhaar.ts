// Aadhaar number sanity check, shared by the form (instant feedback) and the
// server (schema.ts). Offline and free — it needs no UIDAI call.
//
// A real Aadhaar number is 12 digits, never starts with 0 or 1, and its last
// digit is a Verhoeff checksum of the first eleven. That catches typos and
// made-up numbers (e.g. 111111111111, 123456789012). It does NOT prove the
// number was ever issued or belongs to the applicant — that needs UIDAI.

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

function verhoeffIsValid(digits: string): boolean {
  let c = 0
  const reversed = digits.split('').reverse()

  reversed.forEach((ch, i) => {
    c = D[c][P[i % 8][Number(ch)]]
  })

  return c === 0
}

export function isValidAadhaar(value: string): boolean {
  return /^[2-9]\d{11}$/.test(value) && verhoeffIsValid(value)
}

export const AADHAAR_ERROR_MESSAGE = 'Enter a valid 12-digit Aadhaar number (it cannot start with 0 or 1).'
