import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM: authenticated encryption, no extra dependency (Node built-in).
// Layout of the stored ciphertext blob: [12-byte IV][16-byte auth tag][ciphertext].
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const secret = process.env.AADHAAR_ENCRYPTION_KEY

  if (!secret) {
    throw new Error(
      'AADHAAR_ENCRYPTION_KEY must be set (32 bytes, base64-encoded). Generate with: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  const key = Buffer.from(secret, 'base64')

  if (key.length !== 32) {
    throw new Error('AADHAAR_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256.')
  }

  return key
}

/**
 * Encrypts a plaintext Aadhaar number for storage. Never log or return the
 * plaintext input after this call — it should go out of scope immediately.
 */
export function encryptAadhaar(plainTextAadhaar: string): Buffer {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([cipher.update(plainTextAadhaar, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, ciphertext])
}

/**
 * Decrypts a stored Aadhaar ciphertext blob. Only ever call this from a
 * server-side path that has already checked the caller's permission to see
 * unmasked Aadhaar data (RBAC + audit logging) — see .ai/SECURITY.md
 * Section 11 (data masking) and .ai/RBAC.md.
 */
export function decryptAadhaar(blob: Buffer): string {
  const key = getEncryptionKey()
  const iv = blob.subarray(0, IV_LENGTH)
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)

  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Last 4 digits only — safe to store/display unencrypted for masking/lookup purposes. */
export function aadhaarLast4(plainTextAadhaar: string): string {
  return plainTextAadhaar.slice(-4)
}

/** Formats for display: "XXXX-XXXX-1234". Never pass a full Aadhaar to a client component. */
export function maskAadhaar(last4: string): string {
  return `XXXX-XXXX-${last4}`
}
