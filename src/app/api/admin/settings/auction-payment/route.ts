import { NextResponse } from 'next/server'
import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

// All fields optional (not one big required form) — mirrors the Corrigendum
// popup's /api/admin/corrigendum-notice/toggle pattern, so the two
// visibility switches (enabled / showInHeader) can each be toggled
// independently with their own PATCH call (immediate save, no separate
// "Save" button) while the bank-details/text fields are saved together via
// one explicit "Save" button on the settings page.
const schema = z
  .object({
    enabled: z.boolean(),
    showInHeader: z.boolean(),
    beneficiaryName: z.string().trim().max(255).nullable(),
    bankName: z.string().trim().max(255).nullable(),
    accountNumber: z.string().trim().max(100).nullable(),
    ifscCode: z.string().trim().max(50).nullable(),
    branchName: z.string().trim().max(255).nullable(),
    accountType: z.string().trim().max(100).nullable(),
    paymentMode: z.string().trim().max(100).nullable(),
    instructionsText: z.string().trim().max(4000).nullable(),
    instructionsTextHi: z.string().trim().max(4000).nullable(),
    noticeText: z.string().trim().max(2000).nullable(),
    noticeTextHi: z.string().trim().max(2000).nullable(),
    googleFormUrl: z.string().trim().max(500).nullable()
  })
  .partial()

const FIELD_COLUMN_MAP: Record<keyof z.infer<typeof schema>, string> = {
  enabled: 'enabled',
  showInHeader: 'show_in_header',
  beneficiaryName: 'beneficiary_name',
  bankName: 'bank_name',
  accountNumber: 'account_number',
  ifscCode: 'ifsc_code',
  branchName: 'branch_name',
  accountType: 'account_type',
  paymentMode: 'payment_mode',
  instructionsText: 'instructions_text',
  instructionsTextHi: 'instructions_text_hi',
  noticeText: 'notice_text',
  noticeTextHi: 'notice_text_hi',
  googleFormUrl: 'google_form_url'
}

/**
 * Admin: edit the "Auction Payment" public page's bank details, instructions,
 * notice text, Google Form link, and visibility switches (migration 0097) —
 * single singleton row read by the public /auction-payment page and by
 * PublicHeader's conditional nav link. Per explicit request: "sara content
 * admin se mange hoga .. sidebar mai settings mai hi ek tab aajaye ga ..
 * inka link header mai aajaye ga .. link hide karna ho to header ka control
 * bhi admin se ho jaaye ga".
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const rawBody = await request.json().catch(() => null)
    const parsed = schema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const entries = Object.entries(parsed.data) as Array<[keyof z.infer<typeof schema>, unknown]>

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No changes submitted.' }, { status: 400 })
    }

    const setClauses: string[] = []
    const setParams: Array<string | number | null> = []

    for (const [field, value] of entries) {
      setClauses.push(`${FIELD_COLUMN_MAP[field]} = ?`)
      setParams.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | null))
    }

    setClauses.push('updated_by_user_id = ?')
    setParams.push(session.userId)

    await query(`UPDATE auction_payment_settings SET ${setClauses.join(', ')} WHERE id = 1`, setParams)

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'auction_payment_settings.updated',
      module: 'settings',
      entityType: 'auction_payment_settings',
      entityId: '1',
      newValue: parsed.data
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.settings.auction-payment', error)

    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 })
  }
}
