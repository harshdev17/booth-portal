import 'server-only'

import type { NotificationCategory, NotificationService, SendTemplateMessageInput, SendTemplateMessageResult } from '@/lib/notifications/types'

// AiSensy WhatsApp Business API adapter.
//
// Each NotificationCategory maps to one pre-approved AiSensy campaign
// (Manage > Template Message, approved by Meta, then wrapped in a "Live"
// API Campaign in AiSensy). The campaign names below are configured via
// environment variables, NOT hardcoded, because these campaigns do not
// exist yet — KDB/the developer must create and get each template approved
// in the AiSensy dashboard first (this can take anywhere from ~2 minutes to
// 24 hours per Meta's review), then set the corresponding env var to the
// exact campaign name shown in AiSensy. See .ai/NOTIFICATIONS.md.
//
// API reference: POST https://backend.aisensy.com/campaign/t1/api/v2
// https://wiki.aisensy.com/en/articles/11501889-api-reference-docs

const AISENSY_ENDPOINT = 'https://backend.aisensy.com/campaign/t1/api/v2'

const CAMPAIGN_ENV_VAR: Record<NotificationCategory, string> = {
  otp: 'AISENSY_CAMPAIGN_OTP',
  application_confirmation: 'AISENSY_CAMPAIGN_APPLICATION_CONFIRMATION',
  payment_confirmation: 'AISENSY_CAMPAIGN_PAYMENT_CONFIRMATION',
  status_update: 'AISENSY_CAMPAIGN_STATUS_UPDATE',
  document_query: 'AISENSY_CAMPAIGN_DOCUMENT_QUERY',
  pay_now_activation: 'AISENSY_CAMPAIGN_PAY_NOW_ACTIVATION',
  reminder: 'AISENSY_CAMPAIGN_REMINDER'
}

function getCampaignName(category: NotificationCategory): string | null {
  return process.env[CAMPAIGN_ENV_VAR[category]] || null
}

export class AiSensyNotificationService implements NotificationService {
  async sendTemplateMessage(input: SendTemplateMessageInput): Promise<SendTemplateMessageResult> {
    const apiKey = process.env.AISENSY_API_KEY

    if (!apiKey) {
      return { ok: false, error: 'AISENSY_API_KEY is not configured.' }
    }

    const campaignName = getCampaignName(input.category)

    if (!campaignName) {
      return {
        ok: false,
        error: `No AiSensy campaign configured for category "${input.category}" (set ${CAMPAIGN_ENV_VAR[input.category]}).`
      }
    }

    try {
      const response = await fetch(AISENSY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          campaignName,
          destination: input.destination,
          userName: input.userName,
          templateParams: input.templateParams
        })
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')

        return { ok: false, error: `AiSensy request failed (${response.status}): ${body.slice(0, 300)}` }
      }

      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error contacting AiSensy.' }
    }
  }
}
