import 'server-only'

import { randomInt } from 'node:crypto'

/**
 * Generates a human-facing application number, e.g. "IGM-2026-483920"
 * (International Geeta Jayanti Mahotsav — changed from the earlier "KDB-" prefix per
 * explicit instruction; existing "KDB-2026-XXXXXX" applications created
 * before this change remain valid and lookupable — see the
 * /^(?:IGM|KDB)-\d{4}-\d{6}$/ validation pattern used everywhere an
 * application number is accepted from a client, not just here).
 * Uniqueness is enforced by the database UNIQUE constraint on
 * applications.application_number, not by this function alone — callers
 * must retry on a duplicate-key error (astronomically rare given the
 * randomness space, but not impossible, so never assumed).
 */
export function generateApplicationNumber(year: number): string {
  const random = randomInt(100000, 999999)

  return `IGM-${year}-${random}`
}
