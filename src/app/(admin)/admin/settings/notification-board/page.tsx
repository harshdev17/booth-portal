import type { Metadata } from 'next'

import { requirePermission } from '@/lib/rbac/authorize'
import { listAllNotificationFiles } from '@/lib/settings/notification-files'
import NotificationBoardSettingsClient from '@/views/admin/settings/NotificationBoardSettingsClient'

export const metadata: Metadata = {
  title: 'Notification Board — IGM Admin Portal'
}

const NotificationBoardPage = async () => {
  await requirePermission('config:manage')

  const files = await listAllNotificationFiles()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Notification Board</h1>
        <p className='text-sm text-muted-foreground'>
          Upload PDFs or images (notices, circulars, announcements) for the public Notifications page.
        </p>
      </div>

      <NotificationBoardSettingsClient files={files} />
    </div>
  )
}

export default NotificationBoardPage
