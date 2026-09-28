import 'server-only'

import { randomInt } from 'node:crypto'

/**
 * Generates a human-facing application number, e.g. "KDB-2026-483920".
 * Uniqueness is enforced by the database UNIQUE constraint on
 * applications.application_number, not by this function alone — callers
 * must retry on a duplicate-key error (astronomically rare given the
 * randomness space, but not impossible, so never assumed).
 */
export function generateApplicationNumber(year: number): string {
  const random = randomInt(100000, 999999)

  return `KDB-${year}-${random}`
}
