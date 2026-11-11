import { NextResponse } from 'next/server'

import { buildAuctionResultsTemplateCsv } from '@/lib/applications/auction-results-csv'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/** Blank CSV template for the Auction Results upload (see AuctionResultsUploadDialog.tsx). */
export async function GET() {
  try {
    await requirePermission('allotment:perform')

    const csv = buildAuctionResultsTemplateCsv()

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="auction-results-template.csv"'
      }
    })
  } catch (error) {
    logServerError('api.admin.applications.auction-results.template', error)

    return NextResponse.json({ error: 'Failed to generate the template.' }, { status: 500 })
  }
}
