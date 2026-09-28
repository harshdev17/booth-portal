import 'server-only'

// Provider-agnostic notification abstraction per .ai/NOTIFICATIONS.md — business
// code (OTP flow, status-change hooks) depends only on this interface, never on
// an AiSensy-specific payload shape, so the provider can be swapped later.

export type NotificationCategory =
  | 'otp'
  | 'application_confirmation'
  | 'payment_confirmation'
  | 'status_update'
  | 'document_query'
  | 'pay_now_activation'
  | 'reminder'

export type SendTemplateMessageInput = {
  category: NotificationCategory

  /** Mobile number with country code, e.g. +919876543210 */
  destination: string
  userName: string

  /** Positional values matching the approved WhatsApp template's variables, in order. */
  templateParams: string[]
  applicationId?: number
}

export type SendTemplateMessageResult =
  | { ok: true }
  | { ok: false; error: string }

export interface NotificationService {
  sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendTemplateMessageResult>
}
