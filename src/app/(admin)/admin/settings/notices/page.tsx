import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import CorrigendumNoticeSettingsClient, {
  type CorrigendumRowItem
} from '@/views/admin/settings/CorrigendumNoticeSettingsClient'
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

  const [notices, corrigendumSettingsRows, corrigendumRows] = await Promise.all([
    query<NoticeRow[]>(`SELECT id, text, text_hi, display_order, status FROM notices ORDER BY display_order ASC`),
    query<Array<{ enabled: number }>>(`SELECT enabled FROM corrigendum_notice_settings WHERE id = 1 LIMIT 1`),
    query<CorrigendumRowItem[]>(
      `SELECT id, particular, particular_hi, previous_text, previous_text_hi, revised_text, revised_text_hi, display_order, status
       FROM corrigendum_notice_rows ORDER BY display_order ASC`
    )
  ])

  return (
    <div className='flex flex-col gap-10'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Homepage Notices</h1>
        <p className='text-sm text-muted-foreground'>
          Manage what visitors see on the public homepage — the scrolling notice ticker and the Corrigendum popup.
          Changes appear on the public site immediately.
        </p>
      </div>

      <div>
        <h2 className='mb-3 text-lg font-bold text-[#0c2847]'>Scrolling Notice Ticker</h2>
        <NoticesSettingsClient notices={notices} />
      </div>

      <div className='border-t pt-8'>
        <h2 className='mb-3 text-lg font-bold text-[#0c2847]'>Corrigendum Popup</h2>
        <CorrigendumNoticeSettingsClient
          enabled={Boolean(corrigendumSettingsRows[0]?.enabled)}
          rows={corrigendumRows}
        />
      </div>
    </div>
  )
}

export default NoticesSettingsPage
