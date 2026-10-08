import type { Metadata } from 'next'

import { requirePermission } from '@/lib/rbac/authorize'
import { isComingSoonEnabled } from '@/lib/site/coming-soon'
import ComingSoonToggle from '@/views/admin/settings/ComingSoonToggle'

export const metadata: Metadata = {
  title: 'Coming Soon Mode — IGM Admin Portal'
}

/** Admin-controlled switch (site_mode_settings) — no environment variable involved. */
const ComingSoonSettingsPage = async () => {
  await requirePermission('config:manage')

  const enabled = await isComingSoonEnabled()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Coming Soon Mode</h1>
        <p className='text-sm text-muted-foreground'>
          When on, visitors see a &quot;Coming Soon&quot; page instead of the public site. The admin panel stays available
          either way, so you can always log in and work. While you are logged in as an admin you still see the real
          site in the same browser — open it in a new tab to preview it, e.g. the application form.
        </p>
      </div>

      <ComingSoonToggle initialEnabled={enabled} />
    </div>
  )
}

export default ComingSoonSettingsPage
