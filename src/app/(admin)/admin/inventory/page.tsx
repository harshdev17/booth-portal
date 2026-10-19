import type { Metadata } from 'next'

import { DownloadIcon, HistoryIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions, requirePermission } from '@/lib/rbac/authorize'
import { encodeId } from '@/lib/security/opaque-id'
import ImportInventoryDialog from '@/views/admin/inventory/ImportInventoryDialog'
import InventoryTable, { type ShopUnitRowData } from '@/views/admin/inventory/InventoryTable'

export const metadata: Metadata = {
  title: 'Inventory — IGM Admin Portal'
}

// Admin data changes constantly (add/edit/delete/import), and this page's
// counts/table/breakdowns all come from one live DB read — a cached RSC
// payload from an earlier navigation would show stale counts or an empty
// table (reported live: counts showed 1 while the table showed "0 of 0",
// since the client was reusing Next's Router Cache instead of re-querying).
export const dynamic = 'force-dynamic'

type ShopUnitRow = {
  id: number
  stall_number: string
  shop_type: 'single' | 'double'
  category_name: string
  direction: string | null
  emd_amount_paise: number | null
  status: 'available' | 'reserved' | 'allotted' | 'cancelled' | 'rejected'
  application_number: string | null
  application_id: number | null
  is_direct_allotment: number | boolean
  payment_status: string | null
  payment_amount_paise: number | null
  is_cancelled: number | boolean | null
  cancel_reason: string | null
  allotment_payment_deadline_at: string | null
  is_payment_overdue: number | boolean
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

const STATUS_CONFIG: Record<ShopUnitRow['status'], { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-emerald-100 text-emerald-800' },
  reserved: { label: 'Reserved', color: 'bg-amber-100 text-amber-800' },
  allotted: { label: 'Allotted', color: 'bg-purple-100 text-purple-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800' }
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

const InventoryAdminPage = async () => {
  await requirePermission('inventory:view')

  const permissions = await getCurrentUserPermissions()
  const canManage = !!permissions?.has('inventory:manage')
  const canViewLogs = !!permissions?.has('audit:view')

  const [rows, categories, logs] = await Promise.all([
    query<ShopUnitRow[]>(
      `SELECT su.id, su.stall_number, su.shop_type, c.name AS category_name, su.direction, su.emd_amount_paise,
              su.status,
              COALESCE(a.application_number, da.application_number, da.allottee_name) AS application_number,
              COALESCE(a.id, da.application_id) AS application_id,
              (da.id IS NOT NULL OR c.is_direct_allotment = 1) AS is_direct_allotment,
              COALESCE(p.status, da.payment_status) AS payment_status,
              COALESCE(p.amount_paise, da.payment_amount_paise, su.emd_amount_paise, c.allotment_amount_paise) AS payment_amount_paise,
              (da_cancelled.id IS NOT NULL OR su.status = 'cancelled' OR a.status = 'cancelled') AS is_cancelled,
              da_cancelled.notes AS cancel_reason,
              c.allotment_payment_deadline_at,
              (c.allotment_payment_deadline_at IS NOT NULL AND c.allotment_payment_deadline_at < NOW() AND COALESCE(p.status, da.payment_status) NOT IN ('paid', 'success', 'exempt')) AS is_payment_overdue
       FROM shop_units su
       JOIN categories c ON c.id = su.category_id
       LEFT JOIN applications a ON a.id = su.allotted_to_application_id
       LEFT JOIN direct_allotments da ON da.shop_unit_id = su.id AND da.status = 'active'
       LEFT JOIN payments p ON p.application_id = COALESCE(a.id, da.application_id) AND p.status IN ('success', 'paid', 'pending', 'not_initiated')
       LEFT JOIN (
         SELECT shop_unit_id, MAX(id) AS max_id
         FROM direct_allotments
         WHERE status = 'cancelled'
         GROUP BY shop_unit_id
       ) da_canc_max ON da_canc_max.shop_unit_id = su.id
       LEFT JOIN direct_allotments da_cancelled ON da_cancelled.id = da_canc_max.max_id
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

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1

      return acc
    },
    {} as Record<string, number>
  )

  const totalStalls = rows.length
  const availableCount = counts.available ?? 0
  const directAllottedCount = rows.filter(r => Boolean(r.is_direct_allotment)).length
  const reservedCount = counts.reserved ?? 0

  // Category-wise and direction-wise breakdowns, per explicit request
  // ("kis cat ki kitni shops hai, kis direction mai ye count bhi show
  // karo") — counted against the full unfiltered inventory, not whatever
  // the table's own filters currently show, so these stay a stable overview
  // regardless of what the admin is filtering the table to.
  const byCategory = new Map<string, number>()
  const byDirection = new Map<string, number>()

  for (const cat of categories) {
    byCategory.set(cat.name, 0)
  }

  for (const row of rows) {
    byCategory.set(row.category_name, (byCategory.get(row.category_name) ?? 0) + 1)

    const directionKey = row.direction ?? 'Not Specified'

    byDirection.set(directionKey, (byDirection.get(directionKey) ?? 0) + 1)
  }

  const categoryBreakdown = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])
  const directionBreakdown = Array.from(byDirection.entries()).sort((a, b) => b[1] - a[1])

  const shopUnitRows: ShopUnitRowData[] = rows.map(row => ({
    id: encodeId(row.id),
    stallNumber: row.stall_number,
    shopType: row.shop_type,
    categoryName: row.category_name,
    direction: row.direction,
    emdAmountPaise: row.emd_amount_paise,
    status: row.status,
    applicationNumber: row.application_number,
    applicationId: row.application_id,
    isDirectAllotment: Boolean(row.is_direct_allotment),
    paymentStatus: row.payment_status,
    paymentAmountPaise: row.payment_amount_paise,
    isCancelled: Boolean(row.is_cancelled),
    cancelReason: row.cancel_reason,
    allotmentPaymentDeadlineAt: row.allotment_payment_deadline_at,
    isPaymentOverdue: Boolean(row.is_payment_overdue)
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

        {canManage && (
          <div className='flex items-center gap-2'>
            <Button variant='outline' render={<a href='/api/admin/inventory/export' />}>
              <DownloadIcon />
              Export to CSV
            </Button>
            <ImportInventoryDialog validCategoryNames={categories.map(c => c.name)} />
          </div>
        )}
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Card className='shadow-xs border-slate-200/80'>
          <CardContent className='pt-5 pb-5'>
            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              Total Units
            </p>
            <div className='flex items-baseline justify-between mt-1'>
              <p className='text-2xl font-black text-[#0c2847]'>{totalStalls}</p>
              <span className='text-[11px] text-muted-foreground'>All Booths/Stalls</span>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs border-emerald-200/60 bg-emerald-50/20'>
          <CardContent className='pt-5 pb-5'>
            <p className='text-xs font-bold uppercase tracking-wider text-emerald-800'>
              Available Units
            </p>
            <div className='flex items-baseline justify-between mt-1'>
              <p className='text-2xl font-black text-emerald-700'>{availableCount}</p>
              <span className='text-[11px] text-emerald-700/80'>Draw / Open</span>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs border-purple-200/70 bg-purple-50/30'>
          <CardContent className='pt-5 pb-5'>
            <p className='text-xs font-bold uppercase tracking-wider text-purple-800'>
              Direct Allotment
            </p>
            <div className='flex items-baseline justify-between mt-1'>
              <p className='text-2xl font-black text-purple-700'>{directAllottedCount}</p>
              <span className='text-[11px] text-purple-700/80 font-medium'>Admin Allotted</span>
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-xs border-amber-200/60 bg-amber-50/20'>
          <CardContent className='pt-5 pb-5'>
            <p className='text-xs font-bold uppercase tracking-wider text-amber-800'>
              Reserved
            </p>
            <div className='flex items-baseline justify-between mt-1'>
              <p className='text-2xl font-black text-amber-700'>{reservedCount}</p>
              <span className='text-[11px] text-amber-700/80'>On Hold</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Card className='shadow-xs flex flex-col'>
          <CardHeader className='border-b bg-muted/40 py-3 shrink-0'>
            <CardTitle className='text-sm font-bold text-[#0c2847]'>Booths/Stalls by Category</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-1.5 pt-4 max-h-72 overflow-y-auto pr-3'>
            {categoryBreakdown.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No booth/stall units yet.</p>
            ) : (
              categoryBreakdown.map(([name, count]) => (
                <div key={name} className='flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0'>
                  <span className='text-slate-700 truncate pr-2'>{name}</span>
                  <span className='font-bold text-[#0c2847] shrink-0'>{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='shadow-xs flex flex-col'>
          <CardHeader className='border-b bg-muted/40 py-3 shrink-0'>
            <CardTitle className='text-sm font-bold text-[#0c2847]'>Booths/Stalls by Direction</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-1.5 pt-4 max-h-72 overflow-y-auto pr-3'>
            {directionBreakdown.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No booth/stall units yet.</p>
            ) : (
              directionBreakdown.map(([direction, count]) => (
                <div key={direction} className='flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0'>
                  <span className='text-slate-700 truncate pr-2'>{direction}</span>
                  <span className='font-bold text-[#0c2847] shrink-0'>{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue='units' className='min-w-0 w-full'>
        <TabsList>
          <TabsTrigger value='units'>Booth/Stall Units</TabsTrigger>
          {canViewLogs && <TabsTrigger value='logs'>Logs</TabsTrigger>}
        </TabsList>

        <TabsContent value='units' className='min-w-0 w-full'>
          <InventoryTable
            initialRows={shopUnitRows}
            canManage={canManage}
            categoryNames={categories.map(c => c.name)}
            directions={directionBreakdown.map(([direction]) => direction)}
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

export default InventoryAdminPage
