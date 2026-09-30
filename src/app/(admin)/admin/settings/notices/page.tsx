import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import NoticesSettingsClient from '@/views/admin/settings/NoticesSettingsClient'

export const metadata: Metadata = {
  title: 'Homepage Notices — IGM Admin Portal'
}

type NoticeRow = {
  id: number
  text: string
  text_hi: string | null
  display_order: number
  status: 'active' | 'inactive'
}

const NoticesSettingsPage = async () => {
  await requirePermission('config:manage')

  const notices = await query<NoticeRow[]>(`SELECT id, text, text_hi, display_order, status FROM notices ORDER BY display_order ASC`)

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Homepage Notices</h1>
        <p className='text-sm text-muted-foreground'>
          Manage the scrolling notice ticker shown at the top of the public homepage. Add, edit, reorder, or
          deactivate notices — changes appear on the public site immediately.
        </p>
      </div>

      <NoticesSettingsClient notices={notices} />
    </div>
  )
}

export default NoticesSettingsPage
