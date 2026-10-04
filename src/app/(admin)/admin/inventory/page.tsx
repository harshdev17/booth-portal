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

type ShopUnitRow = {
  id: number
  stall_number: string
  shop_type: 'single' | 'double'
  category_name: string
  direction: string | null
  emd_amount_paise: number | null
  status: 'available' | 'reserved' | 'allotted' | 'cancelled'
  application_number: string | null
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
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
}

const LOG_ACTION_LABEL: Record<string, string> = {
  'inventory.imported': 'Bulk Import',
  'inventory.exported': 'Export',
  'inventory.deleted': 'Deleted Stall'
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

    return `Stall ${data.stallNumber} (was ${data.status})`
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
              su.status, a.application_number
       FROM shop_units su
       JOIN categories c ON c.id = su.category_id
       LEFT JOIN applications a ON a.id = su.allotted_to_application_id
       ORDER BY su.stall_number ASC`
    ),
    query<Array<{ name: string }>>(`SELECT name FROM categories WHERE status != 'archived' ORDER BY display_order ASC`),
    canViewLogs
      ? query<InventoryLogRow[]>(
          `SELECT al.id, al.action, u.full_name AS actor_name, al.new_value, al.previous_value, al.created_at
           FROM audit_logs al
           LEFT JOIN users u ON u.id = al.actor_user_id
           WHERE al.module = 'inventory'
           ORDER BY al.created_at DESC
           LIMIT 200`
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

  // Category-wise and direction-wise breakdowns, per explicit request
  // ("kis cat ki kitni shops hai, kis direction mai ye count bhi show
  // karo") — counted against the full unfiltered inventory, not whatever
  // the table's own filters currently show, so these stay a stable overview
  // regardless of what the admin is filtering the table to.
  const byCategory = new Map<string, number>()
  const byDirection = new Map<string, number>()

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
    applicationNumber: row.application_number
  }))

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Inventory / Booths & Stalls</h1>
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
        {(Object.keys(STATUS_CONFIG) as Array<ShopUnitRow['status']>).map(status => (
          <Card key={status} className='shadow-xs'>
            <CardContent className='pt-6'>
              <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                {STATUS_CONFIG[status].label}
              </p>
              <p className='text-2xl font-black text-[#0c2847]'>{counts[status] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <Card className='shadow-xs'>
          <CardHeader className='border-b bg-muted/40 py-3'>
            <CardTitle className='text-sm font-bold text-[#0c2847]'>Booths/Stalls by Category</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-2 pt-4'>
            {categoryBreakdown.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No booth/stall units yet.</p>
            ) : (
              categoryBreakdown.map(([name, count]) => (
                <div key={name} className='flex items-center justify-between text-sm'>
                  <span className='text-slate-700'>{name}</span>
                  <span className='font-bold text-[#0c2847]'>{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='shadow-xs'>
          <CardHeader className='border-b bg-muted/40 py-3'>
            <CardTitle className='text-sm font-bold text-[#0c2847]'>Booths/Stalls by Direction</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col gap-2 pt-4'>
            {directionBreakdown.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No booth/stall units yet.</p>
            ) : (
              directionBreakdown.map(([direction, count]) => (
                <div key={direction} className='flex items-center justify-between text-sm'>
                  <span className='text-slate-700'>{direction}</span>
                  <span className='font-bold text-[#0c2847]'>{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue='units'>
        <TabsList>
          <TabsTrigger value='units'>Booth/Stall Units</TabsTrigger>
          {canViewLogs && <TabsTrigger value='logs'>Logs</TabsTrigger>}
        </TabsList>

        <TabsContent value='units'>
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
