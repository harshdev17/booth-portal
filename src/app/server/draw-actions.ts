'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requirePermission } from '@/lib/rbac/authorize'
import { LuckyDrawService } from '@/lib/draw/draw-service'

const drawActionSchema = z.object({
  categoryId: z.coerce.number().int().positive('Please select a valid category.'),
  clientSeed: z.string().trim().min(3, 'Client seed must be at least 3 characters.').max(128),
  allowWaitlist: z.boolean().default(true),
  waitlistRatio: z.coerce.number().min(0).max(1).default(0.5),
  notes: z.string().trim().max(500).optional()
})

export type DrawActionState = {
  error?: string
  success?: string
  data?: any
}

export async function simulateDrawAction(
  _prevState: DrawActionState,
  formData: FormData
): Promise<DrawActionState> {
  const session = await requirePermission('draw:view')

  const rawAllowWaitlist = formData.get('allowWaitlist')
  const allowWaitlist = rawAllowWaitlist !== null
    ? (rawAllowWaitlist === 'true' || rawAllowWaitlist === '1' || rawAllowWaitlist === 'on')
    : true

  const parsed = drawActionSchema.safeParse({
    categoryId: formData.get('categoryId'),
    clientSeed: formData.get('clientSeed'),
    allowWaitlist,
    waitlistRatio: formData.get('waitlistRatio') ?? 0.5
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid simulation parameters.' }
  }

  try {
    const result = await LuckyDrawService.simulateDraw({
      categoryId: parsed.data.categoryId,
      clientSeed: parsed.data.clientSeed,
      allowWaitlist: parsed.data.allowWaitlist,
      waitlistRatio: parsed.data.allowWaitlist ? parsed.data.waitlistRatio : 0
    })

    const waitlistMsg = parsed.data.allowWaitlist
      ? `, ${result.waitlistCount} waitlisted`
      : ' (Waitlist disabled by admin)'

    return {
      success: `Simulation complete: ${result.allottedCount} candidate(s) allocated${waitlistMsg}.`,
      data: result
    }
  } catch (err: any) {
    return { error: err.message || 'Simulation failed.' }
  }
}

export async function executeDrawAction(
  _prevState: DrawActionState,
  formData: FormData
): Promise<DrawActionState> {
  const session = await requirePermission('draw:run')

  const rawAllowWaitlist = formData.get('allowWaitlist')
  const allowWaitlist = rawAllowWaitlist !== null
    ? (rawAllowWaitlist === 'true' || rawAllowWaitlist === '1' || rawAllowWaitlist === 'on')
    : true

  const parsed = drawActionSchema.safeParse({
    categoryId: formData.get('categoryId'),
    clientSeed: formData.get('clientSeed'),
    allowWaitlist,
    waitlistRatio: formData.get('waitlistRatio') ?? 0.5,
    notes: formData.get('notes')
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid draw execution parameters.' }
  }

  const headerList = await headers()
  const ipAddress = headerList.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined

  try {
    const result = await LuckyDrawService.executeDraw({
      categoryId: parsed.data.categoryId,
      clientSeed: parsed.data.clientSeed,
      allowWaitlist: parsed.data.allowWaitlist,
      waitlistRatio: parsed.data.allowWaitlist ? parsed.data.waitlistRatio : 0,
      notes: parsed.data.notes,
      executedByUserId: session.userId,
      ipAddress
    })

    revalidatePath('/admin/draw')
    revalidatePath('/admin/applications')
    revalidatePath('/admin/inventory')
    revalidatePath('/police/dashboard')

    const waitlistSummary = parsed.data.allowWaitlist
      ? `, ${result.waitlistCount} waitlisted`
      : ' (No waitlist created)'

    return {
      success: `Draw ${result.drawCode} executed successfully! ${result.allottedCount} booths/stalls allotted${waitlistSummary}.`,
      data: result
    }
  } catch (err: any) {
    return { error: err.message || 'Draw execution failed.' }
  }
}
