import 'server-only'

import { query } from '@/lib/db/client'
import { logServerError } from '@/lib/security/error-log'

export type AuctionPaymentSettings = {
  enabled: boolean
  showInHeader: boolean
  beneficiaryName: string | null
  bankName: string | null
  accountNumber: string | null
  ifscCode: string | null
  branchName: string | null
  accountType: string | null
  paymentMode: string | null
  instructionsText: string | null
  instructionsTextHi: string | null
  noticeText: string | null
  noticeTextHi: string | null
  googleFormUrl: string | null
}

const DEFAULT_SETTINGS: AuctionPaymentSettings = {
  enabled: false,
  showInHeader: false,
  beneficiaryName: null,
  bankName: null,
  accountNumber: null,
  ifscCode: null,
  branchName: null,
  accountType: null,
  paymentMode: null,
  instructionsText: null,
  instructionsTextHi: null,
  noticeText: null,
  noticeTextHi: null,
  googleFormUrl: null
}

type Row = {
  enabled: number
  show_in_header: number
  beneficiary_name: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  branch_name: string | null
  account_type: string | null
  payment_mode: string | null
  instructions_text: string | null
  instructions_text_hi: string | null
  notice_text: string | null
  notice_text_hi: string | null
  google_form_url: string | null
}

/**
 * Fully admin-editable "Auction Payment" page settings (migration 0097) —
 * offline NEFT/RTGS bank-transfer instructions, replacing the
 * /auction-payment "Coming Soon" placeholder. Singleton row (id=1), same
 * shape as getSiteNoticeBanners(). `enabled` gates whether the public page
 * shows real content at all (falls back to the Coming Soon notice while
 * off); `showInHeader` independently gates only the PublicHeader nav link,
 * per explicit request: "link hide karna ho to hed ruska control bhi admin
 * se ho jaaye ga" — the page can stay reachable by direct URL even while
 * hidden from the header. Fails closed to DEFAULT_SETTINGS (both off) on any
 * DB error, same pattern as getContactSettings()/getSiteNoticeBanners().
 */
export async function getAuctionPaymentSettings(): Promise<AuctionPaymentSettings> {
  try {
    const rows = await query<Row[]>(
      `SELECT enabled, show_in_header, beneficiary_name, bank_name, account_number, ifsc_code,
              branch_name, account_type, payment_mode, instructions_text, instructions_text_hi,
              notice_text, notice_text_hi, google_form_url
       FROM auction_payment_settings WHERE id = 1 LIMIT 1`
    )

    const row = rows[0]

    if (!row) return DEFAULT_SETTINGS

    return {
      enabled: Boolean(row.enabled),
      showInHeader: Boolean(row.show_in_header),
      beneficiaryName: row.beneficiary_name,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      ifscCode: row.ifsc_code,
      branchName: row.branch_name,
      accountType: row.account_type,
      paymentMode: row.payment_mode,
      instructionsText: row.instructions_text,
      instructionsTextHi: row.instructions_text_hi,
      noticeText: row.notice_text,
      noticeTextHi: row.notice_text_hi,
      googleFormUrl: row.google_form_url
    }
  } catch (error) {
    logServerError('settings.auction-payment', error)

    return DEFAULT_SETTINGS
  }
}
