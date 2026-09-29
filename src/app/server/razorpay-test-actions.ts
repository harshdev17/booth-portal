'use server'

import { logAudit } from '@/lib/audit/log'
import { createRazorpayOrder, RazorpayApiError } from '@/lib/payments/razorpay'
import { requirePermission } from '@/lib/rbac/authorize'

export type TestRazorpayConnectionState = {
  error?: string
  success?: string
  orderId?: string
}

/**
 * Admin-only tool to verify the Razorpay integration is reachable and the
 * configured key ID/secret are valid, by creating one real ₹1 test order via
 * the same createRazorpayOrder() used by the real payment flow (see
 * src/lib/payments/razorpay.ts, src/app/api/applications/[id]/payment/order).
 * Deliberately does not write to the `payments` table or touch any real
 * application — this is a connectivity/credentials check only, not a
 * simulated applicant payment. The order is tagged `kdb_test: 'true'` in its
 * notes so it's identifiable in the Razorpay dashboard if ever inspected.
 */
export async function testRazorpayConnection(
  _prevState: TestRazorpayConnectionState,
  _formData: FormData
): Promise<TestRazorpayConnectionState> {
  void _formData

  const session = await requirePermission('config:manage')

  try {
    const order = await createRazorpayOrder({
      amountPaise: 100,
      receipt: `kdb_test_${Date.now()}`,
      notes: { kdb_test: 'true' }
    })

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'payment.test_connection',
      module: 'settings',
      entityType: 'razorpay_order',
      entityId: order.id,
      newValue: { orderId: order.id, status: order.status }
    })

    return {
      success: `Connected. Test order ${order.id} created successfully (status: ${order.status}).`,
      orderId: order.id
    }
  } catch (error) {
    const message = error instanceof RazorpayApiError || error instanceof Error ? error.message : 'Unknown error.'

    await logAudit({
      actorUserId: session.userId,
      actorRoleKey: session.role.key,
      action: 'payment.test_connection_failed',
      module: 'settings',
      entityType: 'razorpay_order',
      newValue: { error: message }
    })

    return { error: `Connection failed: ${message}` }
  }
}
