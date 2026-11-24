import { NextResponse } from 'next/server'

import { getFieldDefinitionsForCategory } from '@/lib/applications/categories'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

/**
 * Admin-only: a category's active field definitions, for the Edit
 * Application dialog to re-render when an admin changes an application's
 * category (per explicit request, 2026-11-24) — the dialog needs the NEW
 * category's fields, blank, to let the admin fill them in; it already shows
 * the application's own category's fields via the server-rendered page, so
 * this is only fetched on an actual category change in the dialog.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission('application:edit')

  const { id } = await params
  const categoryId = Number(id)

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
  }

  try {
    const definitions = await getFieldDefinitionsForCategory(categoryId)

    return NextResponse.json({
      fields: definitions
        .filter(f => f.field_key !== 'shop_option_id')
        .map(f => ({
          fieldDefinitionId: f.id,
          label: f.label,
          inputType: f.input_type
        }))
    })
  } catch (error) {
    logServerError('api.admin.categories.fields', error, { categoryId })

    return NextResponse.json({ error: 'Failed to load category fields.' }, { status: 500 })
  }
}
