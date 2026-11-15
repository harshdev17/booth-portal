import 'server-only'

import { randomUUID } from 'node:crypto'

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'

/**
 * Cloudflare R2 (S3-compatible) storage for uploaded documents. Replaces the
 * previous local-disk implementation (UPLOADS_DIR) — Hostinger's Business
 * Web Hosting confirmed (2026-10-29 support ticket) that its managed
 * Node.js deployment filesystem is NOT persistent across redeploys, so
 * every uploaded applicant document was silently lost on the next deploy.
 * R2 was chosen for its free tier (10GB storage, zero egress fees) — see
 * .ai/DECISIONS.md.
 *
 * The public API (generateStoragePath/storeFile/readStoredFile/
 * deleteStoredFile) is unchanged so no caller needed to change — only this
 * file's internals moved from local disk to R2.
 */

// Reused across calls within the same server process instead of
// reconstructing per-request — a new S3Client otherwise pays a fresh
// TCP/TLS handshake to R2 on every single upload/read/delete, which was a
// large, avoidable chunk of upload latency.
let cachedClient: S3Client | null = null

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set.')
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },

    // The AWS SDK v3's default HTTP handler has no timeout at all — confirmed
    // live (2026-11-15): a document preview request hung for ~325 seconds
    // while R2 was slow to respond, with the Node process otherwise idle the
    // whole time (normal CPU/memory) rather than any resource or DB problem.
    // connectionTimeout bounds establishing the TCP connection; socketTimeout
    // aborts after that long with no bytes moving. A response that keeps
    // trickling bytes defeats both, so every call also carries an overall
    // deadline (r2Deadline below).
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5_000,
      socketTimeout: 15_000
    })
  })

  return cachedClient
}

const R2_TOTAL_TIMEOUT_MS = 60_000

// Fresh per call — covers the whole operation including reading the body.
function r2Deadline() {
  return { abortSignal: AbortSignal.timeout(R2_TOTAL_TIMEOUT_MS) }
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME

  if (!bucket) {
    throw new Error('R2_BUCKET_NAME must be set.')
  }

  return bucket
}

/**
 * Generates a random, non-guessable object key, namespaced by application
 * id so files for one application are grouped without ever exposing that
 * grouping in a public URL. The extension is derived from the
 * server-detected file type, never the client-supplied filename.
 */
export function generateStoragePath(applicationId: number, extension: 'pdf' | 'jpg' | 'png'): string {
  return `${applicationId}/${randomUUID()}.${extension}`
}

export async function storeFile(storagePath: string, content: Buffer): Promise<void> {
  const client = getR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: storagePath,
      Body: content
    }),
      r2Deadline()
  )
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  const client = getR2Client()

  const result = await client.send(
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: storagePath
    }),
      r2Deadline()
  )

  const byteArray = await result.Body?.transformToByteArray()

  if (!byteArray) {
    throw new Error(`Object body empty for key: ${storagePath}`)
  }

  return Buffer.from(byteArray)
}

export async function deleteStoredFile(storagePath: string): Promise<void> {
  const client = getR2Client()

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: storagePath
      }),
        r2Deadline()
    )
  } catch (error) {
    // Best-effort cleanup (e.g. failed/temporary uploads) — mirrors the
    // previous local-disk implementation's ENOENT tolerance. R2's delete
    // is idempotent (no error for a missing key), so this only guards
    // against genuine network/auth failures being swallowed silently.
    throw error
  }
}
