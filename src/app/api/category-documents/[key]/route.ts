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
 * Serves a category's "View Details" document from R2 by its object key —
 * public by design (anyone can view it without logging in), same reasoning
 * as /api/notification-files/[key] and /api/maps/[key] (migrations
 * 0074/0047). No auth check here is intentional: categories.pdf_path only
 * ever points at this route for a file an admin explicitly uploaded for
 * public viewing on an external-apply category's card (migration 0096).
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params

  if (!/^[a-f0-9-]+\.(pdf|jpg|png)$/i.test(key)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  try {
    const rows = await query<Array<{ pdf_original_filename: string | null }>>(
      `SELECT pdf_original_filename FROM categories WHERE pdf_path = ? LIMIT 1`,
      [`/api/category-documents/${key}`]
    )

    if (!rows[0]) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const extension = key.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = MIME_BY_EXTENSION[extension]

    if (!mimeType) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const fileBuffer = await readStoredFile(`category-documents/${key}`)
    const filename = rows[0].pdf_original_filename || key

    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,

        // Re-fetched via a new object key on every replace (random UUID, see
        // the upload route) — safe to cache aggressively, same as maps/
        // notification-files.
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    logServerError('api.category-documents.serve', error, { key })

    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
