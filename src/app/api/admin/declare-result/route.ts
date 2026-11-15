import { NextResponse } from 'next/server'

import { buildResultSheetTemplate, parseResultSheet, stageResultSheet } from '@/lib/allotment/declare-result'
import { logAudit } from '@/lib/audit/log'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Downloads the blank result sheet template. */
export async function GET() {
  await requirePermission('allotment:perform')

  return new Response(buildResultSheetTemplate(), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="result-sheet-template.csv"'
    }
  })
}

/**
 * Uploads a result sheet (booth ↔ application number). Validates every row
 * against live data and, only if all are valid, saves it as the pending
 * result, replacing any earlier pending sheet. Nothing is assigned and no
 * one is notified until the result is declared.
 */
export async function POST(request: Request) {
  const session = await requirePermission('allotment:perform')
  const { ipAddress } = getRequestMeta(request)

  let file: FormDataEntryValue | null

  try {
    file = (await request.formData()).get('file')
  } catch {
    return NextResponse.json({ error: 'Malformed upload.' }, { status: 400 })
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a CSV file to upload.' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large (maximum 5 MB).' }, { status: 413 })
  }

  const parsed = parseResultSheet(await file.text())

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: 'The sheet has errors. Nothing was saved.', rowErrors: parsed.errors }, { status: 400 })
  }

  try {
    const result = await stageResultSheet(parsed.rows, session.userId)

    if (!result.ok) {
      return NextResponse.json({ error: 'The sheet has errors. Nothing was saved.', rowErrors: result.errors }, { status: 400 })
    }

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'result.sheet_uploaded',
      module: 'allotment',
      entityType: 'result_batch',
      entityId: result.batchId,
      ipAddress,
      newValue: { filename: file.name, rowCount: result.rowCount, createdStalls: result.createdStalls }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ error: 'Declare Result is not enabled yet (migration 0081 pending).' }, { status: 503 })
    }

    if ((error as { code?: string } | null)?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'A booth/stall number in the sheet was just created by someone else. Upload the sheet again.' },
        { status: 409 }
      )
    }

    logServerError('api.admin.declare_result.upload', error)

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
