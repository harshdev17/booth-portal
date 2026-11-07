import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { listActiveNotificationFiles } from '@/lib/settings/notification-files'
import NotificationsView from '@/views/public/notifications'

export const metadata: Metadata = {
  title: 'Notifications | International Geeta Jayanti Mahotsav 2026',
  description:
    'Official notices, circulars, and announcements related to International Gita Jayanti Mahotsav 2026.'
}

// Forced dynamic (not ISR): see src/app/(public)/page.tsx for why a
// per-request CSP nonce is incompatible with caching this route.
export const dynamic = 'force-dynamic'

const NotificationsPage = async () => {
  const files = await listActiveNotificationFiles()

  return (
    <>
      <PublicHeader />
      <NotificationsView files={files} />
      <PublicFooter />
    </>
  )
}

export default NotificationsPage
