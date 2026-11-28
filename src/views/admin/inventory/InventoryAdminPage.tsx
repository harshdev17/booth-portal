import { HistoryIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSession } from '@/lib/auth/session'
import { withPooledConnection } from '@/lib/db/client'
import { getPhysicalBoothCount } from '@/lib/inventory/stall-range'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { encodeId } from '@/lib/security/opaque-id'
import CancelOverdueAndPromoteDialog from '@/views/admin/inventory/CancelOverdueAndPromoteDialog'
import ImportInventoryDialog from '@/views/admin/inventory/ImportInventoryDialog'
import InventoryTable, { type ShopUnitRowData } from '@/views/admin/inventory/InventoryTable'

type ShopUnitRow = {
  id: number
  stall_number: string
  shop_type: 'single' | 'double'
  category_id: number
  category_name: string
  category_status: string
  category_selection_method: string
  direction: string | null
  emd_amount_paise: number | null
  status: 'available' | 'reserved' | 'reserved_for_direct_allotment' | 'allotted' | 'cancelled' | 'rejected'
  application_number: string | null
  application_id: number | null
  is_direct_allotment: number | boolean
  payment_status: string | null
  payment_amount_paise: number | null
  payment_date: string | null

  // Latest payment amount per purpose, for the CSV export's per-category
  // payment columns (Allotment Payment / Auction Participation Payment /
  // Auction Final Payment) — each independent of `payment_amount_paise`
  // above, which only ever reflects the single pay_now/auction_final row
  // used for the on-screen "Stall Amount" column.
  allotment_payment_paise: number | null
  auction_participation_payment_paise: number | null
  auction_final_payment_paise: number | null
  is_cancelled: number | boolean | null
  cancel_reason: string | null
  allotment_payment_deadline_at: string | null
  is_payment_overdue: number | boolean
  created_at: string
  allottee_organisation_name: string | null
  allottee_representative_name: string | null
  allottee_father_name: string | null
  allottee_mobile_number: string | null
  allottee_email: string | null
  allottee_address: string | null
  allottee_aadhaar_last4: string | null
  allottee_work_purpose: string | null
}

type InventoryLogRow = {
  id: number
  action: string
  actor_name: string | null

  // mysql2 auto-parses a JSON column into a JS value — never a raw string
  // to re-JSON.parse() (confirmed directly against the live DB: calling
  // JSON.parse() on it throws "[object Object] is not valid JSON", a real
  // bug hit live and fixed here).
  new_value: Record<string, unknown> | null
  previous_value: Record<string, unknown> | null
  created_at: string
}

const LOG_ACTION_LABEL: Record<string, string> = {
  'inventory.imported': 'Bulk Import',
  'inventory.exported': 'Export',
  'inventory.deleted': 'Deleted Booth/Stall'
}

function summarizeLog(log: InventoryLogRow): string {
  if (log.action === 'inventory.imported' && log.new_value) {
    const data = log.new_value as { inserted: number; updated: number; skippedAllotted: number; totalRows: number }

    return `${data.inserted} added, ${data.updated} updated${data.skippedAllotted > 0 ? `, ${data.skippedAllotted} skipped (allotted)` : ''} — ${data.totalRows} rows total`
  }

  if (log.action === 'inventory.exported' && log.new_value) {
    const data = log.new_value as { row_count: number }

    return `${data.row_count} rows exported`
  }

  if (log.action === 'inventory.deleted' && log.previous_value) {
    const data = log.previous_value as { stallNumber: string; status: string }

    return `Booth/Stall ${data.stallNumber} (was ${data.status})`
  }

  return '—'
}

/**
 * Shared implementation behind both /admin/inventory and /police/inventory
 * (the latter added 2026-11-03 so the police portal's "Inventory /
 * Booths/Stalls" nav link doesn't send a police_user to a URL with "admin"
 * in it — same page/data/permissions either way, requirePermission here is
 * the real gate, not which URL reached it). Extracted out of the page file
 * so both routes render the exact same component rather than one importing
 * a page component from the other route's folder.
 */
export default async function InventoryAdminPage() {
  await requirePermission('inventory:view')

  const session = await getSession()
  const permissions = await getCurrentUserPermissions()
  const canManage = !!permissions?.has('inventory:manage')
  const canViewLogs = !!permissions?.has('audit:view')
  const canSendReminder = !!permissions?.has('payment:reminder')

  // Police sees only All/Allotted/Available tabs, per explicit request
  // (2026-11-04: "isme bas all waala hi dikhe ga police ko to, allotted
  // aur free bas itna hi"), with "Allotted" combining draw + direct
  // allotment counts since police doesn't need that distinction.
  const simplifiedTabs = session?.role.key === 'police_user'

  // All 3 queries share ONE pooled connection instead of each checking out
  // its own — see .ai/CHANGELOG.md 2026-11-14 (same pattern as the
  // dashboard/applications-list pages).
  const [rows, categories, logs] = await withPooledConnection(query =>
    Promise.all([
    query<ShopUnitRow[]>(
      `SELECT su.id, su.stall_number, su.shop_type, c.id AS category_id, c.name AS category_name, c.status AS category_status,
              c.selection_method AS category_selection_method, su.direction, su.emd_amount_paise,
              su.status,
              COALESCE(a.application_number, da.application_number, da.allottee_name) AS application_number,
              COALESCE(a.id, da.application_id) AS application_id,
              -- Allottee details for CSV export (and any future detail view)
              -- — draw/auction allotments come from applications, direct
              -- allotments from direct_allotments; never the full Aadhaar
              -- number, only its last 4 digits, matching the
              -- allotment-letter/masking convention used everywhere else.
              COALESCE(a.organisation_name, da.allottee_name) AS allottee_organisation_name,
              COALESCE(a.representative_name, da.contact_person) AS allottee_representative_name,
              COALESCE(a.father_name, da.father_name) AS allottee_father_name,
              COALESCE(a.mobile_number, da.mobile_number) AS allottee_mobile_number,
              COALESCE(a.email, da.email) AS allottee_email,
              COALESCE(a.address, da.address) AS allottee_address,
              COALESCE(a.aadhaar_last4, RIGHT(da.aadhaar_number, 4)) AS allottee_aadhaar_last4,
              COALESCE(a.work_purpose, da.work_purpose) AS allottee_work_purpose,
              -- Whether THIS stall was actually allotted via the Direct
              -- Allotment flow — driven solely by a real direct_allotments
              -- row, never by categories.is_direct_allotment (that flag only
              -- controls how unallotted CSV-import rows default their
              -- status, see api/admin/inventory/import/route.ts; a category
              -- can carry it while still using draw/auction for its actual
              -- allotments, e.g. Refreshment & Ice Cream — using the flag
              -- here mislabeled every one of its auction-declared stalls as
              -- "Direct Allotment").
              (da.id IS NOT NULL) AS is_direct_allotment,
              COALESCE(p.status, da.payment_status) AS payment_status,
              COALESCE(p.amount_paise, da.payment_amount_paise, su.emd_amount_paise, c.allotment_amount_paise) AS payment_amount_paise,

              -- Completion date of a successful pay_now/auction_final
              -- payment — updated_at (not created_at), since created_at is
              -- when the Razorpay order was first created, not when it was
              -- actually confirmed paid. direct_allotments has no separate
              -- payment-recorded timestamp of its own, so it falls back to
              -- the direct_allotments row's own created_at.
              CASE WHEN p.status IN ('paid', 'success') THEN p.updated_at ELSE da.created_at END AS payment_date,

              -- Per-purpose latest payment amounts for the CSV export's
              -- category-specific columns — independent of payment_amount_paise
              -- above (which only reflects whichever single pay_now/
              -- auction_final row this stall's own join picked).
              allotment_pay.amount_paise AS allotment_payment_paise,
              auction_fee_pay.amount_paise AS auction_participation_payment_paise,
              auction_final_pay.amount_paise AS auction_final_payment_paise,
              (da.id IS NULL AND (
                su.status = 'cancelled' OR a.status = 'cancelled' OR
                -- A direct-allotment cancellation only still counts as "this
                -- stall is cancelled" if nothing has touched the stall since
                -- (e.g. an interchange emptying it out the ordinary way,
                -- which also sets updated_at). Without this, a stall that
                -- was cancelled long ago and later interchanged into/out of
                -- kept showing a stale "Cancelled" badge forever, since
                -- da_cancelled is matched purely by shop_unit_id with no
                -- time bound.
                (da_cancelled.id IS NOT NULL AND
                  (latest_cancel_audit.cancelled_at IS NULL OR su.updated_at <= latest_cancel_audit.cancelled_at))
              )) AS is_cancelled,
              da_cancelled.notes AS cancel_reason,
              -- Draw/manual categories track their deadline in
              -- allotment_payment_deadline_at; an auction category's winners
              -- instead pay against auction_final_payment_deadline_at (the
              -- participation-fee deadline, auction_participation_fee_deadline_at,
              -- is a separate earlier step and not relevant to an already-won stall).
              COALESCE(c.allotment_payment_deadline_at, c.auction_final_payment_deadline_at) AS allotment_payment_deadline_at,
              (
                COALESCE(c.allotment_payment_deadline_at, c.auction_final_payment_deadline_at) IS NOT NULL
                AND COALESCE(c.allotment_payment_deadline_at, c.auction_final_payment_deadline_at) < NOW()
                AND COALESCE(p.status, da.payment_status) NOT IN ('paid', 'success', 'exempt')
              ) AS is_payment_overdue,
              su.created_at
       FROM shop_units su
       JOIN categories c ON c.id = su.category_id
       LEFT JOIN applications a ON a.id = su.allotted_to_application_id
       LEFT JOIN (
         SELECT da1.*
         FROM direct_allotments da1
         JOIN (
           SELECT shop_unit_id, MAX(id) AS max_id
           FROM direct_allotments
           WHERE status = 'active'
           GROUP BY shop_unit_id
         ) da_max ON da_max.max_id = da1.id
       ) da ON da.shop_unit_id = su.id
       LEFT JOIN (
         SELECT p1.application_id, p1.status, p1.amount_paise, p1.updated_at
         FROM payments p1
         JOIN (
           SELECT application_id, MAX(id) AS max_id
           FROM payments
           WHERE purpose IN ('pay_now', 'auction_final')
           GROUP BY application_id
         ) p_max ON p_max.max_id = p1.id
       ) p ON p.application_id = COALESCE(a.id, da.application_id)
       -- One join per purpose for the CSV export's per-category payment
       -- columns -- each independently picks that application's latest
       -- payment row of that specific purpose, regardless of which purpose
       -- the "p" join above picked for the on-screen "Stall Amount" column.
       LEFT JOIN (
         SELECT p1.application_id, p1.amount_paise
         FROM payments p1
         JOIN (
           SELECT application_id, MAX(id) AS max_id FROM payments WHERE purpose = 'pay_now' AND status IN ('paid', 'success') GROUP BY application_id
         ) p_max ON p_max.max_id = p1.id
       ) allotment_pay ON allotment_pay.application_id = COALESCE(a.id, da.application_id)
       LEFT JOIN (
         SELECT p1.application_id, p1.amount_paise
         FROM payments p1
         JOIN (
           SELECT application_id, MAX(id) AS max_id FROM payments WHERE purpose = 'auction_fee' AND status IN ('paid', 'success') GROUP BY application_id
         ) p_max ON p_max.max_id = p1.id
       ) auction_fee_pay ON auction_fee_pay.application_id = COALESCE(a.id, da.application_id)
       LEFT JOIN (
         SELECT p1.application_id, p1.amount_paise
         FROM payments p1
         JOIN (
           SELECT application_id, MAX(id) AS max_id FROM payments WHERE purpose = 'auction_final' AND status IN ('paid', 'success') GROUP BY application_id
         ) p_max ON p_max.max_id = p1.id
       ) auction_final_pay ON auction_final_pay.application_id = COALESCE(a.id, da.application_id)
       LEFT JOIN (
         SELECT shop_unit_id, MAX(id) AS max_id
         FROM direct_allotments
         WHERE status = 'cancelled'
         GROUP BY shop_unit_id
       ) da_canc_max ON da_canc_max.shop_unit_id = su.id
       LEFT JOIN direct_allotments da_cancelled ON da_cancelled.id = da_canc_max.max_id
       LEFT JOIN (
         SELECT entity_id, MAX(created_at) AS cancelled_at
         FROM audit_logs
         WHERE entity_type = 'shop_unit' AND action = 'allotment.cancelled'
         GROUP BY entity_id
       ) latest_cancel_audit ON latest_cancel_audit.entity_id = CAST(su.id AS CHAR)
       ORDER BY su.stall_number ASC`
    ),
    query<Array<{ name: string }>>(`SELECT name FROM categories WHERE status != 'archived' ORDER BY display_order ASC`),
    canViewLogs
      ? query<InventoryLogRow[]>(
          `SELECT al.id, al.action, u.full_name AS actor_name, al.new_value, al.previous_value, al.created_at
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.actor_user_id
           WHERE al.module = 'inventory' OR al.action IN ('direct_allotment.created', 'direct_allotment.interchanged')
           ORDER BY al.created_at DESC
           LIMIT 30`
        )
      : Promise.resolve([])
    ])
  )

  // Direction list for the filter dropdown's option set (the actual "by
  // category"/"by direction" breakdown cards now live inside InventoryTable,
  // computed live from its own filtered rows — see that component).
  const byDirection = new Map<string, number>()

  // direction is free text entered per-stall (no fixed list), so the same
  // physical direction can be typed with different casing/whitespace across
  // rows (e.g. "North" vs "north "). Group case/whitespace-insensitively and
  // keep the first-seen casing as the display label, so the filter dropdown
  // shows one entry per direction instead of near-duplicates.
  const directionDisplay = new Map<string, string>()

  for (const row of rows) {
    const rawDirection = row.direction?.trim() || null
    const directionKey = rawDirection ? rawDirection.toLowerCase() : 'not specified'

    if (!directionDisplay.has(directionKey)) {
      directionDisplay.set(directionKey, rawDirection ?? 'Not Specified')
    }

    byDirection.set(directionKey, (byDirection.get(directionKey) ?? 0) + 1)
  }

  // Overdue unpaid allotments per category, for the super-admin-only
  // "Cancel Overdue & Set New Deadline" action (src/lib/allotment/cancel-and-promote.ts).
  // Scoped to draw-produced allotments only (direct allotments have no
  // waitlist concept, so are out of scope for this action entirely).
  const overdueByCategory = new Map<number, { categoryName: string; count: number }>()

  for (const row of rows) {
    if (!row.is_payment_overdue || row.is_direct_allotment) continue

    const existing = overdueByCategory.get(row.category_id)

    overdueByCategory.set(row.category_id, {
      categoryName: row.category_name,
      count: (existing?.count ?? 0) + getPhysicalBoothCount(row.stall_number)
    })
  }

  const isSuperAdmin = session?.role.key === 'super_admin'

  const directionBreakdown = Array.from(byDirection.entries())
    .map(([key, count]): [string, number] => [directionDisplay.get(key) ?? key, count])
    .sort((a, b) => b[1] - a[1])

  const shopUnitRows: ShopUnitRowData[] = rows.map(row => ({
    id: encodeId(row.id),
    stallNumber: row.stall_number,
    shopType: row.shop_type,
    categoryName: row.category_name,
    categoryIsPublic: row.category_status === 'open',
    categorySelectionMethod: row.category_selection_method,
    direction: row.direction,
    emdAmountPaise: row.emd_amount_paise,
    status: row.status,
    applicationNumber: row.application_number,
    applicationId: row.application_id,
    isDirectAllotment: Boolean(row.is_direct_allotment),
    paymentStatus: row.payment_status,
    paymentAmountPaise: row.payment_amount_paise,
    paymentDate: row.payment_date,
    allotmentPaymentPaise: row.allotment_payment_paise,
    auctionParticipationPaymentPaise: row.auction_participation_payment_paise,
    auctionFinalPaymentPaise: row.auction_final_payment_paise,
    isCancelled: Boolean(row.is_cancelled),
    cancelReason: row.cancel_reason,
    allotmentPaymentDeadlineAt: row.allotment_payment_deadline_at,
    isPaymentOverdue: Boolean(row.is_payment_overdue),
    createdAt: row.created_at,
    allotteeOrganisationName: row.allottee_organisation_name,
    allotteeRepresentativeName: row.allottee_representative_name,
    allotteeFatherName: row.allottee_father_name,
    allotteeMobileNumber: row.allottee_mobile_number,
    allotteeEmail: row.allottee_email,
    allotteeAddress: row.allottee_address,
    allotteeAadhaarLast4: row.allottee_aadhaar_last4,
    allotteeWorkPurpose: row.allottee_work_purpose
  }))

  return (
    <div className='flex flex-col gap-6 min-w-0 w-full'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Inventory / Booths/Stalls</h1>
          <p className='text-sm text-muted-foreground'>
            Physical booth/stall units per category and their current allotment state.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          {/* Export to CSV moved into InventoryTable (2026-11-28) — it now
              builds the CSV client-side from filteredRows so it honours
              every active tab/search/category/status/type/direction/fees
              filter, which this static unfiltered-route link never could. */}
          {canManage && <ImportInventoryDialog validCategoryNames={categories.map(c => c.name)} />}
        </div>
      </div>

      {isSuperAdmin && overdueByCategory.size > 0 && (
        <Card className='shadow-xs border-red-200/70 bg-red-50/20'>
          <CardHeader className='border-b bg-muted/40 py-3 shrink-0'>
            <CardTitle className='text-sm font-bold text-red-800'>Overdue Unpaid Allotments</CardTitle>
            <CardDescription className='text-xs'>
              These categories have booths/stalls still unpaid past their deadline. Cancelling frees the booth/stall
              and auto-promotes the next waitlisted applicant(s).
            </CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3 pt-4'>
            {Array.from(overdueByCategory.entries()).map(([categoryId, { categoryName, count }]) => (
              <div key={categoryId} className='flex items-center justify-between gap-3 rounded-lg border border-red-200/60 bg-white p-3'>
                <div>
                  <p className='text-sm font-bold text-[#0c2847]'>{categoryName}</p>
                  <p className='text-xs text-muted-foreground'>{count} overdue unpaid allotment(s)</p>
                </div>
                <CancelOverdueAndPromoteDialog categoryId={categoryId} categoryName={categoryName} overdueCount={count} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue='units' className='min-w-0 w-full'>
        <TabsList>
          <TabsTrigger value='units'>Booth/Stall Units</TabsTrigger>
          {canViewLogs && <TabsTrigger value='logs'>Logs</TabsTrigger>}
        </TabsList>

        <TabsContent value='units' className='min-w-0 w-full'>
          <InventoryTable
            initialRows={shopUnitRows}
            canManage={canManage}
            canSendReminder={canSendReminder}
            categoryNames={categories.map(c => c.name)}
            directions={directionBreakdown.map(([direction]) => direction)}
            simplifiedTabs={simplifiedTabs}
          />
        </TabsContent>

        {canViewLogs && (
          <TabsContent value='logs'>
            <Card className='shadow-xs'>
              <CardHeader className='border-b bg-muted/40 py-4'>
                <CardTitle className='text-base font-bold text-[#0c2847]'>Inventory Activity Log</CardTitle>
                <CardDescription className='text-xs'>
                  Every import, export, and deletion — most recent first.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-0'>
                {logs.length === 0 ? (
                  <div className='py-16 text-center'>
                    <HistoryIcon className='mx-auto mb-2 size-8 text-muted-foreground/50' />
                    <p className='text-sm font-semibold text-muted-foreground'>No activity yet.</p>
                  </div>
                ) : (
                  <div className='divide-y'>
                    {logs.map(log => (
                      <div key={log.id} className='flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='text-sm font-bold text-slate-800'>
                              {LOG_ACTION_LABEL[log.action] ?? log.action}
                            </span>
                            <span className='text-xs text-muted-foreground'>by {log.actor_name ?? 'System'}</span>
                          </div>
                          <p className='text-sm text-slate-600'>{summarizeLog(log)}</p>
                        </div>
                        <p className='text-xs text-muted-foreground'>{new Date(log.created_at).toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
