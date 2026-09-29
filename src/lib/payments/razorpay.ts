import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

// Raw REST calls against the Razorpay API rather than the `razorpay` npm
// package — matches the existing AiSensy integration's pattern (see
// src/lib/notifications/aisensy.ts) of a small fetch-based adapter instead
// of a new dependency, per CLAUDE.md Section 8 ("avoid unnecessary
// dependencies"). Never called from a 'use client' file — the secret key
// must only ever exist in server memory.

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1'

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getRazorpayKeyId(): string {
  return requireEnv('RAZORPAY_KEY_ID')
}

function getAuthHeader(): string {
  const keyId = requireEnv('RAZORPAY_KEY_ID')
  const keySecret = requireEnv('RAZORPAY_KEY_SECRET')

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
}

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
}

export class RazorpayApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RazorpayApiError'
  }
}

/**
 * Creates a Razorpay order server-side. `amountPaise` must always be derived
 * from configuration (category fee) by the caller — never accepted from
 * client input (.ai/PAYMENT.md Section 8). `receipt` should be the
 * human-facing application number for reconciliation; `notes` carries
 * non-sensitive metadata only (Razorpay notes are visible in their
 * dashboard, so nothing like Aadhaar or contact details belongs here).
 */
export async function createRazorpayOrder(input: {
  amountPaise: number
  receipt: string
  notes?: Record<string, string>
}): Promise<RazorpayOrder> {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      payment_capture: 1,
      notes: input.notes ?? {}
    })
  })

  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.id) {
    const reason = body?.error?.description ?? `HTTP ${response.status}`

    throw new RazorpayApiError(`Razorpay order creation failed: ${reason}`)
  }

  return { id: body.id, amount: body.amount, currency: body.currency, status: body.status }
}

function hmacSha256Hex(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function timingSafeHexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')

  if (bufA.length !== bufB.length) return false

  return timingSafeEqual(bufA, bufB)
}

/**
 * Verifies the signature Razorpay Checkout.js returns to the client on
 * success, which the client then forwards to our server. This is the
 * mandatory server-side check — a client-reported "success" is never
 * trusted alone (.ai/PAYMENT.md Section 4, .ai/SECURITY.md).
 */
export function verifyCheckoutSignature(input: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): boolean {
  const keySecret = requireEnv('RAZORPAY_KEY_SECRET')
  const expected = hmacSha256Hex(`${input.razorpayOrderId}|${input.razorpayPaymentId}`, keySecret)

  if (expected.length !== input.razorpaySignature.length) return false

  return timingSafeHexEqual(expected, input.razorpaySignature)
}

/**
 * Verifies the X-Razorpay-Signature header on an inbound webhook against the
 * exact raw request body bytes (must be verified before JSON.parse — a
 * re-serialized body will not match). Uses RAZORPAY_WEBHOOK_SECRET, which is
 * distinct from the API key secret (configured separately in the Razorpay
 * dashboard's webhook settings).
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = requireEnv('RAZORPAY_WEBHOOK_SECRET')
  const expected = hmacSha256Hex(rawBody, webhookSecret)

  if (expected.length !== signature.length) return false

  return timingSafeHexEqual(expected, signature)
}
