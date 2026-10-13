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
 *   SMTP_USER, SMTP_PASSWORD, SMTP_FROM (e.g. "KDB Stall Portal <no-reply@your-domain>").
 * Until SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM are all set, email is
 * simply skipped (and recorded as failed in notification_log) — it never
 * blocks the WhatsApp message or the action that triggered it.
 */

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

type Content = { subject: string; en: string[]; hi: string[] }

/**
 * Builds the email for a notification category from the same positional
 * values the WhatsApp template receives (see the call sites in
 * lib/notifications/*). OTP codes are deliberately never emailed.
 */
export function buildEmailContent(
  category: NotificationCategory,
  params: string[]
): { subject: string; text: string; html: string } | null {
  const [name = '', appNo = '', third = '', fourth = ''] = params
  const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/status`
  let c: Content

  switch (category) {
    case 'application_confirmation':
      c = {
        subject: `Application ${appNo} received`,
        en: [`Dear ${name},`, `Your application ${appNo} has been received. We will review it and keep you updated.`],
        hi: [`प्रिय ${name},`, `आपका आवेदन ${appNo} प्राप्त हो गया है। हम इसकी समीक्षा करेंगे और आपको सूचित करते रहेंगे।`]
      }
      break
    case 'payment_confirmation':
      c = {
        subject: `Payment received for application ${appNo}`,
        en: [`Dear ${name},`, `We have received your payment of ₹${third} for application ${appNo}. Thank you.`],
        hi: [`प्रिय ${name},`, `आवेदन ${appNo} के लिए आपका ₹${third} का भुगतान प्राप्त हो गया है। धन्यवाद।`]
      }
      break
    case 'status_update':
      c = {
        subject: `Update on application ${appNo}: ${third}`,
        en: [`Dear ${name},`, `The status of your application ${appNo} is now: ${third}.`],
        hi: [`प्रिय ${name},`, `आपके आवेदन ${appNo} की स्थिति अब: ${third} है।`]
      }
      break
    case 'document_query':
      c = {
        subject: `Action needed on application ${appNo}`,
        en: [
          `Dear ${name},`,
          `The review team has a query on your document "${third}" for application ${appNo}:`,
          `"${fourth}"`,
          `Please upload the corrected document from the Check Application Status page: ${statusUrl}`
        ],
        hi: [
          `प्रिय ${name},`,
          `आवेदन ${appNo} में आपके दस्तावेज़ "${third}" पर समीक्षा टीम की टिप्पणी:`,
          `"${fourth}"`,
          `कृपया आवेदन स्थिति पृष्ठ से सही दस्तावेज़ अपलोड करें: ${statusUrl}`
        ]
      }
      break
    case 'pay_now_activation':
      c = {
        subject: `Payment is now open for application ${appNo}`,
        en: [`Dear ${name},`, `Payment is now open for your application ${appNo}. Please visit ${statusUrl} to continue.`],
        hi: [`प्रिय ${name},`, `आपके आवेदन ${appNo} के लिए भुगतान अब खुला है। आगे बढ़ने के लिए ${statusUrl} पर जाएँ।`]
      }
      break
    case 'reminder':
      c = {
        subject: `Reminder for application ${appNo}`,
        en: [`Dear ${name},`, `This is a reminder regarding your application ${appNo}. Please check ${statusUrl}.`],
        hi: [`प्रिय ${name},`, `यह आपके आवेदन ${appNo} से संबंधित एक अनुस्मारक है। कृपया ${statusUrl} देखें।`]
      }
      break
    default:
      return null
  }

  const footer = 'Kurukshetra Development Board — International Gita Jayanti Mahotsav 2026'
  const text = [...c.en, '', ...c.hi, '', footer].join('\n')
  const block = (lines: string[]) => lines.map(l => `<p style="margin:0 0 10px">${escapeHtml(l)}</p>`).join('')

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17202e">
${block(c.en)}<hr style="border:0;border-top:1px solid #dde2ea;margin:16px 0">${block(c.hi)}
<p style="margin:18px 0 0;color:#5b6678;font-size:13px">${escapeHtml(footer)}</p></div>`

  return { subject: `[KDB] ${c.subject}`, text, html }
}
