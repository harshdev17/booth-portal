import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { getSiteNoticeBanners } from '@/lib/homepage/site-notice-banners'
import { requirePermission } from '@/lib/rbac/authorize'
import CorrigendumNoticeSettingsClient, {
  type CorrigendumRowItem
} from '@/views/admin/settings/CorrigendumNoticeSettingsClient'

export const metadata: Metadata = { title: 'Corrigendum Popup — IGM Admin Portal' }

type SettingsRow = {
  enabled: number
  heading: string
  heading_hi: string
  subheading: string
  subheading_hi: string
  footer_text: string
  footer_text_hi: string
}

const CorrigendumNoticePage = async () => {
  await requirePermission('config:manage')

  const [settingsRows, corrigendumRows, noticeBanners] = await Promise.all([
    query<SettingsRow[]>(
      `SELECT enabled, heading, heading_hi, subheading, subheading_hi, footer_text, footer_text_hi
       FROM corrigendum_notice_settings WHERE id = 1 LIMIT 1`
    ),
    query<CorrigendumRowItem[]>(
      `SELECT id, particular, particular_hi, previous_text, previous_text_hi, revised_text, revised_text_hi, display_order, status
       FROM corrigendum_notice_rows ORDER BY display_order ASC`
    ),
    getSiteNoticeBanners()
  ])

  const settings = settingsRows[0]

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Corrigendum Popup</h1>
        <p className='text-sm text-muted-foreground'>
          The revised-schedule popup shown to every visitor on the public homepage, right after the language
          prompt. Changes appear on the public site immediately.
        </p>
      </div>
      <CorrigendumNoticeSettingsClient
        enabled={Boolean(settings?.enabled)}
        heading={settings?.heading ?? 'Important Notice'}
        headingHi={settings?.heading_hi ?? 'महत्वपूर्ण सूचना'}
        subheading={settings?.subheading ?? 'Revised Schedule'}
        subheadingHi={settings?.subheading_hi ?? 'संशोधित कार्यक्रम'}
        footerText={settings?.footer_text ?? ''}
        footerTextHi={settings?.footer_text_hi ?? ''}
        rows={corrigendumRows}
        noticeBanners={noticeBanners}
      />
    </div>
  )
}

export default CorrigendumNoticePage
