import 'server-only'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'

export type SiteNoticeBanners = {
  paymentPendingText: string
  paymentPendingTextHi: string
  paymentPendingEnabled: boolean
  letterAvailableText: string
  letterAvailableTextHi: string
  letterAvailableEnabled: boolean
}

const DEFAULT_BANNERS: SiteNoticeBanners = {
  paymentPendingText:
    'If the amount has been deducted from your bank account after a successful payment, but the portal still shows Pending Payment, please wait 24 hours. Your payment will be updated successfully.',
  paymentPendingTextHi:
    'यदि आपकी पेमेंट सफल होने के बाद बैंक खाते से पैसे कट गए हैं, लेकिन पोर्टल पर अभी भी Pending Payment दिखा रहा है, तो कृपया 24 घंटे प्रतीक्षा करें। आपकी पेमेंट सफलतापूर्वक अपडेट हो जाएगी।',
  paymentPendingEnabled: true,
  letterAvailableText:
    'The official Allotment Letter for applicants who have paid the allotment fee will be available for download starting 23 November 2026.',
  letterAvailableTextHi:
    'आवंटन शुल्क (Allotment Fee) का भुगतान करने वाले आवेदकों का आधिकारिक आवंटन पत्र (Allotment Letter) 23 नवंबर 2026 से डाउनलोड किया जा सकेगा।',
  letterAvailableEnabled: true
}

/**
 * Shared text + on/off switch for PaymentPendingNotice / LetterAvailableNotice
 * — identical banners shown on three public surfaces (Corrigendum popup,
 * /status, Allotment Letter page). Admin-editable from a single place
 * (migrations 0092/0093) per explicit request (2026-11-25): "ye bhi admin se
 * hi manage hona chahiye bhai" / "remove ya add kaise hoga" — editing or
 * toggling it once updates all three surfaces, since they already share
 * these same two components. Fails closed to the original hardcoded
 * wording (both enabled) on any DB error, same pattern as
 * getContactSettings().
 */
export async function getSiteNoticeBanners(): Promise<SiteNoticeBanners> {
  try {
    const rows = await query<
      Array<{
        payment_pending_text: string
        payment_pending_text_hi: string
        payment_pending_enabled: number
        letter_available_text: string
        letter_available_text_hi: string
        letter_available_enabled: number
      }>
    >(
      `SELECT payment_pending_text, payment_pending_text_hi, payment_pending_enabled,
              letter_available_text, letter_available_text_hi, letter_available_enabled
       FROM site_notice_banners WHERE id = 1 LIMIT 1`
    )

    const row = rows[0]

    if (!row) return DEFAULT_BANNERS

    return {
      paymentPendingText: row.payment_pending_text,
      paymentPendingTextHi: row.payment_pending_text_hi,
      paymentPendingEnabled: Boolean(row.payment_pending_enabled),
      letterAvailableText: row.letter_available_text,
      letterAvailableTextHi: row.letter_available_text_hi,
      letterAvailableEnabled: Boolean(row.letter_available_enabled)
    }
  } catch (error) {
    logServerError('homepage.site-notice-banners', error)

    return DEFAULT_BANNERS
  }
}
