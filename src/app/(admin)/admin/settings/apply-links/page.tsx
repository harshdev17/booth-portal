import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import ApplyLinksClient, { type ApplyLinkRow, type ApplyLinkCategoryOption } from '@/views/admin/settings/ApplyLinksClient'

export const metadata: Metadata = { title: 'Apply-Anyway Links — IGM Admin Portal' }

const ApplyLinksPage = async () => {
  await requirePermission('config:manage')

  const [categories, links] = await Promise.all([
    query<ApplyLinkCategoryOption[]>(`SELECT id, name FROM categories WHERE status != 'archived' ORDER BY name ASC`),
    query<ApplyLinkRow[]>(
      `SELECT bl.id, bl.token, bl.category_id AS categoryId, c.name AS categoryName, c.slug AS categorySlug,
              bl.use_count AS useCount, bl.expires_at AS expiresAt, bl.revoked_at AS revokedAt,
              bl.created_at AS createdAt, bl.last_used_at AS lastUsedAt
       FROM application_bypass_links bl
       JOIN categories c ON c.id = bl.category_id
       ORDER BY bl.created_at DESC`
    )
  ])

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Apply-Anyway Links</h1>
        <p className='text-sm text-muted-foreground'>
          Generate a link for a specific applicant to submit a form for a category even while it is closed to the
          public — the category stays closed for everyone else. Anyone holding this link can submit as many times
          as needed, until it&apos;s revoked or expires.
        </p>
      </div>
      <ApplyLinksClient categories={categories} initialLinks={links} />
    </div>
  )
}

export default ApplyLinksPage
