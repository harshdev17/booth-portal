import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { readStoredFile } from '@/lib/uploads/storage'

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png'
}

/**
 * Serves a Notification Board file from R2 by its object key — these are
 * public by design (anyone can view/download a posted notice without
 * logging in), unlike applicant documents (/api/documents/[id]/preview,
 * which is authorization-gated). No auth check here is intentional, not an
 * oversight: notification_files.file_path only ever points at this route
 * for a file an admin explicitly uploaded for public posting (migration
 * 0074) — same pattern as /api/maps/[key].
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params

  // key is just the filename (e.g. "<uuid>.pdf") — reject anything that
  // doesn't match that shape before it's ever used to build an R2 object
  // key, even though storage.ts's own key is always server-generated.
  if (!/^[a-f0-9-]+\.(pdf|jpg|png)$/i.test(key)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<Array<{ original_filename: string | null }>>(
      `SELECT original_filename FROM notification_files WHERE file_path = ? LIMIT 1`,
      [`/api/notification-files/${key}`]
    )

    if (!rows[0]) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const extension = key.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = MIME_BY_EXTENSION[extension]

    if (!mimeType) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const fileBuffer = await readStoredFile(`notifications/${key}`)
    const filename = rows[0].original_filename || key

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,

        // Notification files are re-fetched via a new object key on every
        // replace (random UUID), never mutated in place — safe to cache
        // aggressively, unlike the no-store applicant-document route.
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    logServerError('api.notification-files.serve', error, { key })

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
