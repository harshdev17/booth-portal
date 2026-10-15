import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

import type { NotificationCategory } from '@/lib/notifications/types'

/**
 * Email delivery (nodemailer over SMTP) — the same messages an applicant gets
 * on WhatsApp are also emailed to the address on their application.
 *
 * Configured entirely through environment variables so no secret lives in
 * source (see .env.example):
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE ("true" for port 465),
 *   SMTP_USER, SMTP_PASSWORD, SMTP_FROM (e.g. "IGM Booth/Stall Portal <no-reply@your-domain>").
 * Until SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM are all set, email is
 * simply skipped (and recorded as failed in notification_log) — it never
 * blocks the WhatsApp message or the action that triggered it.
 */

/** How long an emailed / WhatsApp code stays valid (also used by lib/notifications/otp.ts). */
export const OTP_VALID_MINUTES = 10

let transporter: Transporter | null = null

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM)
}

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587)

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    })
  }

  return transporter
}

export type EmailResult = { ok: true } | { ok: false; error: string }

export async function sendEmail(input: { to: string; subject: string; text: string; html: string }): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: 'Email is not configured (SMTP settings missing).' }
  }

  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    })

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown email error.' }
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const EMAIL_PORTAL_NAME = 'IGM Booth/Stall Portal'

type Content = {
  subject: string
  en: string[]
  hi: string[]

  /** Page the applicant should open (shown as a plain link under the text). */
  link?: string
}

export type EmailContact = { phone?: string | null; email?: string | null }

/**
 * Builds the email for a notification category from the same positional
 * values the WhatsApp template receives (see the call sites in
 * lib/notifications/*). Deliberately a short plain letter — a few sentences,
 * English then Hindi, no headings, boxes or buttons — so it reads like a note
 * from the office rather than a marketing email.
 */
export function buildEmailContent(
  category: NotificationCategory,
  params: string[],
  contact: EmailContact = {}
): { subject: string; text: string; html: string } | null {
  const [name = '', appNo = '', third = '', fourth = ''] = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  // No site address configured -> no link at all (a bare "/status" would be useless in an email).
  const statusUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/status` : undefined
  let c: Content

  switch (category) {
    case 'otp':
      c = {
        subject: 'Your verification code',
        en: [
          `Your verification code is ${name}.`,
          `It is valid for ${OTP_VALID_MINUTES} minutes. Please do not share it with anyone.`
        ],
        hi: [
          `आपका सत्यापन कोड ${name} है।`,
          `यह ${OTP_VALID_MINUTES} मिनट तक मान्य है। कृपया इसे किसी के साथ साझा न करें।`
        ]
      }
      break
    case 'application_confirmation':
      c = {
        subject: `Application ${appNo} received`,
        en: [`Dear ${name},`, `Your application ${appNo} has been received and is under review. We will inform you of any update.`],
        hi: [`प्रिय ${name},`, `आपका आवेदन ${appNo} प्राप्त हो गया है और समीक्षाधीन है। कोई भी अपडेट होने पर आपको सूचित किया जाएगा।`],
        link: statusUrl
      }
      break
    case 'payment_confirmation':
      c = {
        subject: `Payment received for application ${appNo}`,
        en: [`Dear ${name},`, `We have received your payment of Rs. ${third} for application ${appNo}. Thank you.`],
        hi: [`प्रिय ${name},`, `आवेदन ${appNo} के लिए आपका रु. ${third} का भुगतान प्राप्त हो गया है। धन्यवाद।`],
        link: statusUrl
      }
      break
    case 'status_update':
      c = {
        subject: `Update on application ${appNo}`,
        en: [`Dear ${name},`, `The status of your application ${appNo} is now: ${third}.`],
        hi: [`प्रिय ${name},`, `आपके आवेदन ${appNo} की स्थिति अब: ${third} है।`],
        link: statusUrl
      }
      break
    case 'document_query':
      c = {
        subject: `Action needed on application ${appNo}`,
        en: [
          `Dear ${name},`,
          `Regarding your application ${appNo}: your document "${third}" needs to be corrected. Reviewer's note: ${fourth}`,
          'Please upload the corrected document using the link below.'
        ],
        hi: [
          `प्रिय ${name},`,
          `आपके आवेदन ${appNo} के संबंध में: आपका दस्तावेज़ "${third}" सुधारा जाना है। समीक्षक की टिप्पणी: ${fourth}`,
          'कृपया नीचे दिए गए लिंक से सही दस्तावेज़ अपलोड करें।'
        ],
        link: statusUrl
      }
      break
    case 'pay_now_activation':
      c = {
        subject: `Payment is now open for application ${appNo}`,
        en: [`Dear ${name},`, `Payment is now open for your application ${appNo}. You can pay using the link below.`],
        hi: [`प्रिय ${name},`, `आपके आवेदन ${appNo} के लिए भुगतान अब खुला है। आप नीचे दिए गए लिंक से भुगतान कर सकते हैं।`],
        link: statusUrl
      }
      break
    case 'reminder':
      c = {
        subject: `Reminder for application ${appNo}`,
        en: [`Dear ${name},`, `This is a reminder about your application ${appNo}. Please check its status using the link below.`],
        hi: [`प्रिय ${name},`, `यह आपके आवेदन ${appNo} के बारे में एक अनुस्मारक है। कृपया नीचे दिए गए लिंक से स्थिति देखें।`],
        link: statusUrl
      }
      break
    default:
      return null
  }

  const helpdesk = [contact.phone, contact.email].filter(Boolean).join(' / ')
  const subject = `${c.subject} – ${EMAIL_PORTAL_NAME}`

  // One message, both languages, every element appearing ONCE (link, sign-off,
  // helpdesk): Gmail folds repeated blocks away as "trimmed content", which
  // hid the Hindi half when each language carried its own sign-off.
  const signOff = ['Regards / धन्यवाद,', EMAIL_PORTAL_NAME, 'Kurukshetra Development Board / कुरुक्षेत्र विकास बोर्ड']
  const autoLine = 'This is an automated message; please do not reply. / यह स्वचालित संदेश है, कृपया उत्तर न दें।'

  // ---- plain text
  const text = [
    ...c.en,
    '------------------------------',
    ...c.hi,
    ...(c.link ? [c.link] : []),
    signOff.join('\n'),
    ...(helpdesk ? [`Helpdesk / हेल्पडेस्क: ${helpdesk}`] : []),
    autoLine
  ].join('\n\n')

  // ---- HTML: a clean, lightly styled card (grey page, white card, one navy accent)
  const para = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#1f2933">${escapeHtml(t)}</p>`

  const link = c.link
    ? `<p style="margin:4px 0 18px;font-size:15px"><a href="${escapeHtml(c.link)}" style="color:#0c4a8a;font-weight:bold">${escapeHtml(c.link)}</a></p>`
    : ''

  const otpCode = category === 'otp' ? name : ''

  const codeBlock = otpCode
    ? `<p style="margin:6px 0 16px;font-size:30px;font-weight:bold;letter-spacing:6px;color:#0c2847">${escapeHtml(otpCode)}</p>`
    : ''

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6">
<div style="padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e1e4e8;border-top:4px solid #0c2847">
    <div style="padding:20px 28px 14px">
      <div style="font-size:17px;font-weight:bold;color:#0c2847">${EMAIL_PORTAL_NAME}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">Kurukshetra Development Board &middot; International Gita Jayanti Mahotsav 2026</div>
    </div>
    <div style="padding:6px 28px 8px;border-top:1px solid #eceff3">
      <p style="margin:14px 0 12px;font-size:18px;font-weight:bold;color:#111827">${escapeHtml(c.subject)}</p>
      ${c.en.map(para).join('')}${codeBlock}
      <div style="border-top:1px solid #eceff3;margin:18px 0 16px"></div>
      ${c.hi.map(para).join('')}
      ${link}
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#374151">${signOff.map(escapeHtml).join('<br>')}</p>
    </div>
    <div style="padding:14px 28px;background:#f8f9fb;border-top:1px solid #eceff3">
      ${helpdesk ? `<p style="margin:0 0 4px;font-size:12px;color:#4b5563">Helpdesk / हेल्पडेस्क: ${escapeHtml(helpdesk)}</p>` : ''}
      <p style="margin:0;font-size:12px;color:#6b7280">${escapeHtml(autoLine)}</p>
    </div>
  </div>
</div></body></html>`

  return { subject, text, html }
}
