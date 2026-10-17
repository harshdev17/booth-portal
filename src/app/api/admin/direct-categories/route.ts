import { NextResponse } from 'next/server'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150)
}

export async function POST(request: Request) {
  const session = await requirePermission('allotment:perform')
  const body = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })

  const event = await query<Array<{ id: number }>>(`SELECT id FROM events WHERE status = 'active' ORDER BY id DESC LIMIT 1`)
  if (!event[0]) return NextResponse.json({ error: 'No active event is configured.' }, { status: 400 })

  const baseSlug = slugify(name)
  if (!baseSlug) return NextResponse.json({ error: 'Enter a valid category name.' }, { status: 400 })

  const duplicate = await query<Array<{ id: number }>>(
    `SELECT id FROM categories WHERE event_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
    [event[0].id, name]
  )
  if (duplicate[0]) return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 })

  const taken = await query<Array<{ slug: string }>>(`SELECT slug FROM categories WHERE event_id = ? AND slug LIKE ?`, [event[0].id, `${baseSlug}%`])
  const slug = taken.some(row => row.slug === baseSlug) ? `${baseSlug}-${taken.length + 1}` : baseSlug
  const result = await query<{ insertId: number }>(
    `INSERT INTO categories (event_id, slug, name, selection_method, status, is_direct_allotment, display_order)
     VALUES (?, ?, ?, 'manual', 'closed', 1, 9999)`,
    [event[0].id, slug, name]
  )

  await logAudit({ actorUserId: session.userId, actorRoleKey: session.role.key, action: 'direct_category.created', module: 'allotment', entityType: 'category', entityId: String(result.insertId), newValue: { name, slug } })
  return NextResponse.json({ id: result.insertId, name }, { status: 201 })
}
