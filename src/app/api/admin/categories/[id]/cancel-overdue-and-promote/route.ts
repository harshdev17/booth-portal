import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cancelOverdueAndPromote } from '@/lib/allotment/cancel-and-promote'
import { getSession } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const schema = z.object({ newDeadline: z.string().datetime() })

/**
 * Super-admin-only action (not tied to any grantable permission, per
 * explicit request): cancels every overdue unpaid allotment in this
 * category, auto-promotes the same number of waitlisted candidates into
 * the now-freed stalls, and sets a new category-wide payment deadline.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()

    if (!session) throw new AuthenticationError()
    if (session.role.key !== 'super_admin') throw new AuthorizationError('super_admin')

    const { id } = await params
    const categoryId = Number(id)

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 })
    }

    const parsed = schema.safeParse(await request.json().catch(() => null))

    if (!parsed.success) {
      return NextResponse.json({ error: 'A valid newDeadline is required.' }, { status: 400 })
    }

    const newDeadline = new Date(parsed.data.newDeadline)

    if (newDeadline.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'The new deadline must be in the future.' }, { status: 400 })
    }

    const result = await cancelOverdueAndPromote(categoryId, newDeadline, session.userId, session.role.key)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: 'Only a Super Admin can perform this action.' }, { status: 403 })
    }

    logServerError('api.admin.categories.cancel-overdue-and-promote', error)

    return NextResponse.json({ error: 'Failed to process overdue allotments.' }, { status: 500 })
  }
}
