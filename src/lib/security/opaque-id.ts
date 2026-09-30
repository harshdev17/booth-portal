import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Encrypts a numeric database primary key (application id, payment id, etc.)
// into an opaque URL-safe token, so admin URLs like /admin/applications/44
// never expose the raw sequential row id — every admin route is already
// permission-checked server-side, but a bare sequential id in the URL still
// lets anyone with any admin access enumerate nearby ids and browse records
// they otherwise wouldn't have clicked into, and leaks the total row count.
// AES-256-GCM, same pattern as aadhaar-crypto.ts. Never used for anything
// requiring cryptographic non-malleability of the plaintext beyond "don't
// let a client guess/derive another valid id" — the real authorization
// check always still happens after decoding, exactly as it did with the
// plain numeric id before.
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.OPAQUE_ID_KEY ?? process.env.AADHAAR_ENCRYPTION_KEY

  if (!secret) {
    throw new Error(
      'OPAQUE_ID_KEY (or AADHAAR_ENCRYPTION_KEY as a fallback) must be set (32 bytes, base64-encoded).'
    )
  }

  const key = Buffer.from(secret, 'base64')

  if (key.length !== 32) {
    throw new Error('OPAQUE_ID_KEY must decode to exactly 32 bytes for AES-256.')
  }

  return key
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')

  return Buffer.from(padded, 'base64')
}

/** Encodes a positive integer row id into an opaque, URL-safe token for use in admin route links. */
export function encodeId(id: number): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([cipher.update(String(id), 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return toBase64Url(Buffer.concat([iv, authTag, ciphertext]))
}

/**
 * Decodes a token produced by encodeId() back to the row id. Returns null on
 * any malformed/tampered/invalid input rather than throwing — callers should
 * treat null exactly like an invalid id (e.g. notFound()), never as a
 * different kind of error.
 */
export function decodeId(token: string): number | null {
  try {
    const blob = fromBase64Url(token)

    if (blob.length <= IV_LENGTH + AUTH_TAG_LENGTH) return null

    const key = getKey()
    const iv = blob.subarray(0, IV_LENGTH)
    const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)

    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
    const id = Number(plaintext)

    if (!Number.isInteger(id) || id <= 0) return null

    return id
  } catch {
    return null
  }
}
