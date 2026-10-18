import 'server-only'

import { randomBytes, createHash } from 'node:crypto'

import type { PoolConnection } from 'mysql2/promise'

import { getPool } from '@/lib/db/client'
import { ProvablyFairRandom } from '@/lib/draw/provably-fair'
import { logAudit } from '@/lib/audit/log'
import { notifyApplicationStatusChange } from '@/lib/notifications/application-status'
import { sendNotification } from '@/lib/notifications/service'

export interface DrawSimulationParams {
  categoryId: number
  clientSeed: string
  allowWaitlist?: boolean
  waitlistRatio?: number
}

export interface DrawExecutionParams extends DrawSimulationParams {
  executedByUserId: number
  ipAddress?: string
  notes?: string
}

export type CandidateRow = {
  applicationId: number
  applicationNumber: string
  representativeName: string
  organisationName: string
  mobileNumber: string
  email: string
  aadhaarLast4: string
}

export type StallRow = {
  shopUnitId: number
  stallNumber: string
  shopType: 'single' | 'double'
  direction: string | null
}

export type DrawPreviewResult = {
  category: { id: number; name: string }
  totalEligible: number
  totalAvailableStalls: number
  allottedCount: number
  waitlistCount: number
  unallocatedCount: number
  serverSeedHash: string
  allocations: Array<{
    applicationNumber: string
    representativeName: string
    mobileNumber: string
    stallNumber: string | null
    type: 'allotted' | 'waitlist' | 'unallocated'
    drawPosition: number
    waitlistPosition: number | null
  }>
}

export class LuckyDrawService {
  /**
   * Runs an in-memory simulation / dry-run without locking stalls or mutating DB.
   */
  public static async simulateDraw(params: DrawSimulationParams): Promise<DrawPreviewResult> {
    const pool = getPool()

    const [categoryRows] = await pool.query<any[]>(
      `SELECT id, name FROM categories WHERE id = ? LIMIT 1`,
      [params.categoryId]
    )

    if (!categoryRows.length) throw new Error('Category not found.')
    const category = categoryRows[0]

    // Fetch eligible applications (approved by committee, excluding under_review/drafts/already allotted)
    const [candidates] = await pool.query<any[]>(
      `SELECT a.id AS applicationId, a.application_number AS applicationNumber,
              a.representative_name AS representativeName, a.organisation_name AS organisationName,
              a.mobile_number AS mobileNumber, a.email, a.aadhaar_last4 AS aadhaarLast4
       FROM applications a
       LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
       WHERE a.category_id = ?
         AND a.status IN ('approved', 'selected')
         AND su.id IS NULL
       ORDER BY a.id ASC`,
      [params.categoryId]
    )

    // Fetch available stalls
    const [stalls] = await pool.query<any[]>(
      `SELECT id AS shopUnitId, stall_number AS stallNumber, shop_type AS shopType, direction
       FROM shop_units
       WHERE category_id = ? AND status = 'available'
       ORDER BY stall_number ASC`,
      [params.categoryId]
    )

    const serverSeed = randomBytes(32).toString('hex')
    const serverSeedHash = ProvablyFairRandom.hashSeed(serverSeed)

    const shuffledCandidates = ProvablyFairRandom.shuffle<CandidateRow>(
      candidates,
      serverSeed,
      params.clientSeed
    )

    const shuffledStalls = ProvablyFairRandom.shuffle<StallRow>(
      stalls,
      serverSeed,
      `${params.clientSeed}:stalls`
    )

    const allowWaitlist = params.allowWaitlist ?? true
    const waitlistRatio = params.waitlistRatio ?? 0.5
    const maxWaitlist = allowWaitlist ? Math.max(0, Math.floor(stalls.length * waitlistRatio)) : 0

    const allocations: DrawPreviewResult['allocations'] = []
    let allottedCount = 0
    let waitlistCount = 0
    let unallocatedCount = 0

    for (let i = 0; i < shuffledCandidates.length; i++) {
      const candidate = shuffledCandidates[i]
      const drawPosition = i + 1

      if (i < shuffledStalls.length) {
        allottedCount++
        allocations.push({
          applicationNumber: candidate.applicationNumber,
          representativeName: candidate.representativeName,
          mobileNumber: candidate.mobileNumber,
          stallNumber: shuffledStalls[i].stallNumber,
          type: 'allotted',
          drawPosition,
          waitlistPosition: null
        })
      } else if (allowWaitlist && waitlistCount < maxWaitlist) {
        waitlistCount++
        allocations.push({
          applicationNumber: candidate.applicationNumber,
          representativeName: candidate.representativeName,
          mobileNumber: candidate.mobileNumber,
          stallNumber: null,
          type: 'waitlist',
          drawPosition,
          waitlistPosition: waitlistCount
        })
      } else {
        unallocatedCount++
        allocations.push({
          applicationNumber: candidate.applicationNumber,
          representativeName: candidate.representativeName,
          mobileNumber: candidate.mobileNumber,
          stallNumber: null,
          type: 'unallocated',
          drawPosition,
          waitlistPosition: null
        })
      }
    }

    return {
      category: { id: category.id, name: category.name },
      totalEligible: candidates.length,
      totalAvailableStalls: stalls.length,
      allottedCount,
      waitlistCount,
      unallocatedCount,
      serverSeedHash,
      allocations
    }
  }

  /**
   * Executes the Lucky Draw inside an atomic database transaction.
   * Locks candidates and stalls, snapshots eligible candidates, updates inventory and applications.
   */
  public static async executeDraw(params: DrawExecutionParams) {
    const pool = getPool()
    const conn: PoolConnection = await pool.getConnection()

    try {
      await conn.beginTransaction()

      // 1. Lock category
      const [categoryRows] = await conn.query<any[]>(
        `SELECT id, name, allotment_payment_enabled, allotment_payment_deadline_at, allotment_amount_paise FROM categories WHERE id = ? FOR UPDATE`,
        [params.categoryId]
      )

      if (!categoryRows.length) throw new Error('Category not found.')
      const category = categoryRows[0]

      // 2. Fetch & lock eligible candidates (approved by committee, non-allotted)
      const [candidates] = await conn.query<any[]>(
        `SELECT a.id AS applicationId, a.application_number AS applicationNumber,
                a.representative_name AS representativeName, a.organisation_name AS organisationName,
                a.mobile_number AS mobileNumber, a.email, a.aadhaar_last4 AS aadhaarLast4
         FROM applications a
         LEFT JOIN shop_units su ON su.allotted_to_application_id = a.id
         WHERE a.category_id = ?
           AND a.status IN ('approved', 'selected')
           AND su.id IS NULL
         ORDER BY a.id ASC FOR UPDATE`,
        [params.categoryId]
      )

      if (candidates.length === 0) {
        throw new Error('No eligible candidates found for this draw.')
      }

      // 3. Fetch & lock available stalls
      const [stalls] = await conn.query<any[]>(
        `SELECT id AS shopUnitId, stall_number AS stallNumber, shop_type AS shopType, direction
         FROM shop_units
         WHERE category_id = ? AND status = 'available'
         ORDER BY stall_number ASC FOR UPDATE`,
        [params.categoryId]
      )

      if (stalls.length === 0) {
        throw new Error('No available booth/stall units in this category.')
      }

      // 4. Generate Cryptographic Seeds
      const serverSeed = randomBytes(32).toString('hex')
      const serverSeedHash = ProvablyFairRandom.hashSeed(serverSeed)
      const combinedSeedHash = ProvablyFairRandom.combineSeeds(serverSeed, params.clientSeed)

      // 5. Determine Round Number
      const [roundRows] = await conn.query<any[]>(
        `SELECT COALESCE(MAX(round_number), 0) + 1 AS nextRound FROM draw_events WHERE category_id = ?`,
        [params.categoryId]
      )

      const roundNumber = Number(roundRows[0].nextRound)
      const drawCode = `DRAW-${params.categoryId}-R${roundNumber}-${Date.now().toString(36).toUpperCase()}`

      // 6. Insert Draw Event record
      const [insertEvent] = await conn.query<any>(
        `INSERT INTO draw_events (
          draw_code, category_id, round_number, status,
          server_seed, server_seed_hash, client_seed, combined_seed_hash,
          total_eligible_candidates, total_available_stalls,
          notes, executed_by_user_id, completed_at
        ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          drawCode,
          params.categoryId,
          roundNumber,
          serverSeed,
          serverSeedHash,
          params.clientSeed,
          combinedSeedHash,
          candidates.length,
          stalls.length,
          params.notes ?? null,
          params.executedByUserId
        ]
      )

      const drawEventId = insertEvent.insertId

      // 7. Store Candidate Snapshot
      const snapshotValues = candidates.map((cand, idx) => [
        drawEventId,
        cand.applicationId,
        idx,
        createHash('sha256')
          .update(`${cand.applicationId}:${cand.applicationNumber}:${cand.mobileNumber}`)
          .digest('hex')
      ])

      await conn.query(
        `INSERT INTO draw_candidate_snapshots 
         (draw_event_id, application_id, initial_index, candidate_hash) 
         VALUES ?`,
        [snapshotValues]
      )

      // 8. Deterministic Shuffle
      const shuffledCandidates = ProvablyFairRandom.shuffle<CandidateRow>(
        candidates,
        serverSeed,
        params.clientSeed
      )

      const shuffledStalls = ProvablyFairRandom.shuffle<StallRow>(
        stalls,
        serverSeed,
        `${params.clientSeed}:stalls`
      )

      const allowWaitlist = params.allowWaitlist ?? true
      const waitlistRatio = params.waitlistRatio ?? 0.5
      const maxWaitlist = allowWaitlist ? Math.max(0, Math.floor(stalls.length * waitlistRatio)) : 0

      const allocationRows: any[] = []
      const stallUpdateIds: number[] = []
      const allottedAppIds: number[] = []
      let allottedCount = 0
      let waitlistCount = 0

      for (let i = 0; i < shuffledCandidates.length; i++) {
        const candidate = shuffledCandidates[i]
        const drawPosition = i + 1
        const verificationToken = randomBytes(24).toString('hex')

        if (i < shuffledStalls.length) {
          // Allotted Winner
          const stall = shuffledStalls[i]

          allottedCount++
          stallUpdateIds.push(stall.shopUnitId)
          allottedAppIds.push(candidate.applicationId)

          allocationRows.push([
            drawEventId,
            candidate.applicationId,
            stall.shopUnitId,
            'allotted',
            drawPosition,
            null,
            'allotted',
            verificationToken
          ])
        } else if (waitlistCount < maxWaitlist) {
          // Waitlist
          waitlistCount++
          allocationRows.push([
            drawEventId,
            candidate.applicationId,
            null,
            'waitlist',
            drawPosition,
            waitlistCount,
            'allotted',
            verificationToken
          ])
        } else {
          // Beyond waitlist quota
          break
        }
      }

      // 9. Batch Insert Allocations
      if (allocationRows.length > 0) {
        await conn.query(
          `INSERT INTO draw_allocations (
            draw_event_id, application_id, shop_unit_id, allocation_type,
            draw_position, waitlist_position, status, verification_token
          ) VALUES ?`,
          [allocationRows]
        );
      }

      // 10. Update Allotted Stalls (associate stall with allotted application)
      const isPaymentRequired = Boolean(
        category.allotment_payment_enabled &&
        category.allotment_amount_paise &&
        Number(category.allotment_amount_paise) > 0
      )
      const stallStatus = isPaymentRequired ? 'reserved' : 'allotted'
      const applicationNewStatus = isPaymentRequired ? 'payment_required' : 'allotted'

      for (let idx = 0; idx < allottedCount; idx++) {
        const stall = shuffledStalls[idx]
        const candidate = shuffledCandidates[idx]

        await conn.query(
          `UPDATE shop_units 
           SET status = ?, allotted_to_application_id = ? 
           WHERE id = ?`,
          [stallStatus, candidate.applicationId, stall.shopUnitId]
        )
      }

      // 11. Update Applications Status
      if (allottedAppIds.length > 0) {
        await conn.query(
          `UPDATE applications SET status = ? WHERE id IN (?)`,
          [applicationNewStatus, allottedAppIds]
        )

        // Seed initial payment record for each winner if payment is required
        if (isPaymentRequired) {
          const amountPaise = Number(category.allotment_amount_paise)
          for (const appId of allottedAppIds) {
            await conn.query(
              `INSERT INTO payments (application_id, purpose, amount_paise, status)
               VALUES (?, 'pay_now', ?, 'not_initiated')
               ON DUPLICATE KEY UPDATE amount_paise = ?, status = IF(status = 'success', 'success', 'not_initiated')`,
              [appId, amountPaise, amountPaise]
            )
          }
        }
      }

      // 12. Update Draw Event Totals
      await conn.query(
        `UPDATE draw_events 
         SET total_allotted = ?, total_waitlisted = ? 
         WHERE id = ?`,
        [allottedCount, waitlistCount, drawEventId]
      )

      await conn.commit()

      // The draw is already committed before notifications are attempted, so a
      // provider outage can never undo or leave the auditable allocation in a
      // half-complete state. Only actual booth/stall winners are notified;
      // waitlisted and unallocated candidates receive no draw notification.
      await Promise.allSettled(
        shuffledCandidates.slice(0, allottedCount).flatMap(candidate => {
          const promises: Promise<unknown>[] = [
            notifyApplicationStatusChange({
              applicationId: candidate.applicationId,
              applicationNumber: candidate.applicationNumber,
              mobileNumber: candidate.mobileNumber,
              email: candidate.email,
              representativeName: candidate.representativeName,
              newStatus: applicationNewStatus
            })
          ]

          if (isPaymentRequired) {
            const destination = candidate.mobileNumber.startsWith('+')
              ? candidate.mobileNumber
              : `+91${candidate.mobileNumber}`
            promises.push(
              sendNotification({
                category: 'pay_now_activation',
                destination,
                userName: candidate.representativeName,
                templateParams: [candidate.representativeName, candidate.applicationNumber],
                buttonParam: candidate.applicationNumber,
                applicationId: candidate.applicationId,
                email: candidate.email
              })
            )
          }

          return promises
        })
      )

      // 13. Audit log
      await logAudit({
        actorUserId: params.executedByUserId,
        actorRoleKey: null,
        action: 'draw.executed',
        module: 'draw',
        entityType: 'draw_event',
        entityId: String(drawEventId),
        ipAddress: params.ipAddress,
        newValue: {
          drawCode,
          categoryId: params.categoryId,
          categoryName: category.name,
          allottedCount,
          waitlistCount,
          serverSeedHash,
          clientSeed: params.clientSeed,
          combinedSeedHash
        }
      })

      return {
        success: true,
        drawEventId,
        drawCode,
        categoryName: category.name,
        allottedCount,
        waitlistCount,
        serverSeed,
        serverSeedHash,
        clientSeed: params.clientSeed,
        combinedSeedHash
      }
    } catch (error) {
      await conn.rollback()
      throw error
    } finally {
      conn.release()
    }
  }
}
