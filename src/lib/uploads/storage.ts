import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve } from 'node:path'

/**
 * Local-disk storage for uploaded documents, kept entirely outside
 * `public/` so nothing here is ever web-servable by a static file route —
 * the only way to read a file back is through an authorized API handler
 * that calls readStoredFile() after its own permission check (see
 * .ai/STORAGE.md, .ai/SECURITY.md Section 6).
 *
 * Chosen for this phase per the interim storage decision recorded in
 * .ai/DECISIONS.md; the small surface here (store/read/delete by an opaque
 * relative path) is deliberately the only thing callers depend on, so
 * swapping to an S3-compatible provider later does not require touching
 * any calling code — only this file.
 */

function getUploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR

  if (!configured) {
    throw new Error('UPLOADS_DIR must be set.')
  }

  return resolve(configured)
}

/**
 * Resolves a stored relative path against the uploads root and verifies the
 * result cannot escape that root — defense in depth against path traversal
 * even though storagePath values are always server-generated, never
 * user-supplied, in normal operation.
 */
function resolveSafePath(storagePath: string): string {
  const root = getUploadsRoot()
  const resolved = normalize(join(root, storagePath))

  if (!resolved.startsWith(root)) {
    throw new Error('Resolved upload path escapes the uploads root — refusing to proceed.')
  }

  return resolved
}

/**
 * Generates a random, non-guessable relative storage path, namespaced by
 * application id so files for one application are grouped without ever
 * exposing that grouping in a public URL. The extension is derived from the
 * server-detected file type, never the client-supplied filename.
 */
export function generateStoragePath(applicationId: number, extension: 'pdf' | 'jpg' | 'png'): string {
  return join(String(applicationId), `${randomUUID()}.${extension}`)
}

export async function storeFile(storagePath: string, content: Buffer): Promise<void> {
  const fullPath = resolveSafePath(storagePath)

  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, { mode: 0o600 })
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  return readFile(resolveSafePath(storagePath))
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  try {
    await unlink(resolveSafePath(storagePath))
  } catch (error) {
    // Best-effort cleanup (e.g. failed/temporary uploads) — a missing file
    // is not itself an error worth surfacing to the caller.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
