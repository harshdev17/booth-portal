'use server'

import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

export type ApplicationActionState = {
  error?: string
  success?: string
}

const decisionSchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  reason: z.string().trim().max(512).optional()
})

/**
 * Admin decision on an application awaiting review. Only the two transitions
 * documented in .ai/APPLICATION_FLOW.md Section 3 for this stage are
 * supported here — under_review -> selected / rejected. "Not Selected" is a
 * draw outcome (.ai/DRAW_PROCESS.md), not a manual admin override, and isn't
 * built here since the draw module doesn't exist yet. Every decision is
 * audit-logged per CLAUDE.md Section 12 / .ai/AUDIT_LOGS.md.
 */
async function decideApplication(
  _prevState: ApplicationActionState,
  formData: FormData,
  toStatus: 'selected' | 'rejected'
): Promise<ApplicationActionState> {
  const parsed = decisionSchema.safeParse({
    applicationId: formData.get('applicationId'),
    reason: formData.get('reason') || undefined
  })

  if (!parsed.success) {
    return { error: 'Invalid request.' }
  }

  if (toStatus === 'rejected' && !parsed.data.reason) {
    return { error: 'A reason is required to reject an application.' }
  }

  const session = await requirePermission(toStatus === 'selected' ? 'application:approve' : 'application:reject')

  const rows = await query<Array<{ status: string; application_number: string }>>(
    'SELECT status, application_number FROM applications WHERE id = ?',
    [parsed.data.applicationId]
  )

  const current = rows[0]

  if (!current) {
    return { error: 'Application not found.' }
  }

  if (current.status !== 'under_review') {
    return {
      error: `This application is "${current.status}", not "Under Review" — it cannot be decided from here.`
    }
  }

  await query('UPDATE applications SET status = ? WHERE id = ?', [toStatus, parsed.data.applicationId])

  await logAudit({
    actorUserId: session.userId,
    actorRoleKey: session.role.key,
    action: toStatus === 'selected' ? 'application.selected' : 'application.rejected',
    module: 'applications',
    entityType: 'application',
    entityId: String(parsed.data.applicationId),
    previousValue: { status: current.status },
    newValue: { status: toStatus, reason: parsed.data.reason ?? null, application_number: current.application_number }
  })

  // Application ids in the URL are now opaque, randomly-reencrypted tokens
  // (see src/lib/security/opaque-id.ts) — encodeId() never reproduces the
  // exact token currently in the admin's address bar, so a path-specific
  // revalidatePath() can't target it. Not needed anyway: this detail page is
  // an uncached server component that queries the DB fresh on every
  // request, so revalidating the list page (which the decision buttons
  // navigate back to) is sufficient for the Router Cache.
  revalidatePath('/admin/applications')

  return { success: toStatus === 'selected' ? 'Application marked as Selected.' : 'Application rejected.' }
}

export async function selectApplicationAction(
  prevState: ApplicationActionState,
  formData: FormData
): Promise<ApplicationActionState> {
  return decideApplication(prevState, formData, 'selected')
}

export async function rejectApplicationAction(
  prevState: ApplicationActionState,
  formData: FormData
): Promise<ApplicationActionState> {
  return decideApplication(prevState, formData, 'rejected')
}
