import { NextResponse } from 'next/server'

import { z } from 'zod'

import { logAudit } from '@/lib/audit/log'
import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import { logServerError } from '@/lib/security/error-log'

const emptyToNull = (v: string) => (v.trim() ? v.trim() : null)

const bodySchema = z.object({
  phone: z.string().trim().max(20).transform(emptyToNull).nullable(),
  email: z
    .string()
    .trim()
    .max(191)
    .transform(emptyToNull)
    .nullable()
    .refine(v => v === null || z.string().email().safeParse(v).success, 'Enter a valid email address.'),
  whatsappNumber: z.string().trim().max(20).transform(emptyToNull).nullable(),
  address: z.string().trim().max(255).transform(emptyToNull).nullable(),
  addressHi: z.string().trim().max(255).transform(emptyToNull).nullable(),
  facebookUrl: z.string().trim().max(255).transform(emptyToNull).nullable(),
  instagramUrl: z.string().trim().max(255).transform(emptyToNull).nullable(),
  youtubeUrl: z.string().trim().max(255).transform(emptyToNull).nullable(),
  twitterUrl: z.string().trim().max(255).transform(emptyToNull).nullable()
})

/**
 * Updates the single site-wide contact-settings row (migration 0022) that
 * PublicHeader/PublicFooter/FloatingContactButtons/ContactBannerSection all
 * now read via ContactSettingsProvider instead of hardcoding their own copy
 * of the phone/email/social links.
 */
export async function PATCH(request: Request) {
  try {
    const session = await requirePermission('config:manage')

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 })
    }

    const d = parsed.data

    await query(
      `INSERT INTO site_contact_settings
         (id, phone, email, whatsapp_number, address, address_hi, facebook_url, instagram_url, youtube_url, twitter_url, updated_by_user_id)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone), email = VALUES(email), whatsapp_number = VALUES(whatsapp_number),
         address = VALUES(address), address_hi = VALUES(address_hi), facebook_url = VALUES(facebook_url),
         instagram_url = VALUES(instagram_url), youtube_url = VALUES(youtube_url), twitter_url = VALUES(twitter_url),
         updated_by_user_id = VALUES(updated_by_user_id)`,
      [
        d.phone,
        d.email,
        d.whatsappNumber,
        d.address,
        d.addressHi,
        d.facebookUrl,
        d.instagramUrl,
        d.youtubeUrl,
        d.twitterUrl,
        session.userId
      ]
    )

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'settings.contact_updated',
      module: 'settings',
      entityType: 'site_contact_settings',
      entityId: '1',
      newValue: d
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError('api.admin.settings.contact', error)

    return NextResponse.json({ error: 'Failed to save contact settings.' }, { status: 500 })
  }
}
