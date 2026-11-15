import { NextResponse } from 'next/server'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'
import { readStoredFile } from '@/lib/uploads/storage'

/**
 * Serves a Results PDF from R2 by its object key — public by design
 * (anyone can view/download a declared result without logging in), same
 * pattern as /api/notification-files/[key] and /api/maps/[key]. No auth
 * check here is intentional, not an oversight: result_documents.file_path
 * only ever points at this route for a file an admin explicitly uploaded
 * for public posting.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params

  // key is just the filename (e.g. "<uuid>.pdf") — reject anything that
  // doesn't match that shape before it's ever used to build an R2 object
  // key, even though storage.ts's own key is always server-generated.
  if (!/^[a-f0-9-]+\.pdf$/i.test(key)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<Array<{ original_filename: string }>>(
      `SELECT original_filename FROM result_documents WHERE file_path = ? LIMIT 1`,
      [`/api/results/${key}`]
    )

    if (!rows[0]) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const fileBuffer = await readStoredFile(`results/${key}`)
    const filename = rows[0].original_filename || key

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,

        // Result files are re-fetched via a new object key on every
        // replace (random UUID), never mutated in place — safe to cache
        // aggressively, unlike the no-store applicant-document route.
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    logServerError('api.results.serve', error, { key })

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
