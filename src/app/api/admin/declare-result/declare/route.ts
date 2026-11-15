import { NextResponse } from 'next/server'
import { z } from 'zod'

import { declareResult, DeclareResultError } from '@/lib/allotment/declare-result'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'

const bodySchema = z.object({ batchId: z.string().uuid() })

/**
 * Declares the pending result sheet: assigns every booth, updates statuses
 * and payments, then notifies the applicants. The batchId the admin was
 * looking at is required, so a newer upload can never be declared by a
 * stale page.
 */
export async function POST(request: Request) {
  const session = await requirePermission('allotment:perform')
  const { ipAddress } = getRequestMeta(request)

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    const result = await declareResult(parsed.data.batchId, session.userId, ipAddress)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof DeclareResultError) {
      return NextResponse.json({ error: error.message, problems: error.problems }, { status: 409 })
    }

    logServerError('api.admin.declare_result.declare', error)

    return NextResponse.json({ error: 'Something went wrong. Nothing was declared. Please try again.' }, { status: 500 })
  }
}
