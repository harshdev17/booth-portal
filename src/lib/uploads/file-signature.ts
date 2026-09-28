/**
 * Minimal magic-byte (file signature) detection, scoped deliberately to only
 * the three document types this application accepts: PDF, JPEG, PNG. Never
 * trust a file's extension or client-reported Content-Type — both are
 * attacker-controlled. This checks the actual leading bytes of the content.
 *
 * A small hand-rolled check (rather than pulling in a general-purpose
 * file-type detection library) is used here because the accepted-type set
 * is small, fixed, and security-critical: fewer moving parts, easier to
 * fully audit by reading this one file.
 */

export type DetectedFileType = 'application/pdf' | 'image/jpeg' | 'image/png'

const SIGNATURES: ReadonlyArray<{ mimeType: DetectedFileType; bytes: number[]; offset?: number }> = [
  { mimeType: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }
]

/**
 * Returns the detected MIME type based on file content, or null if the
 * content does not match any allowed signature. Callers must treat a null
 * result as "reject the upload" — never fall back to trusting the
 * client-supplied Content-Type or the filename extension.
 */
export function detectFileType(buffer: Buffer): DetectedFileType | null {
  for (const signature of SIGNATURES) {
    const offset = signature.offset ?? 0

    if (buffer.length < offset + signature.bytes.length) continue

    const matches = signature.bytes.every((byte, index) => buffer[offset + index] === byte)

    if (matches) return signature.mimeType
  }

  return null
}

export function isAllowedDetectedType(
  detected: DetectedFileType | null,
  allowedMimeTypes: readonly string[]
): detected is DetectedFileType {
  return detected !== null && allowedMimeTypes.includes(detected)
}
