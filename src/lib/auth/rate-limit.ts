import 'server-only'

/**
 * Minimal in-memory fixed-window rate limiter for the login endpoint.
 *
 * Known limitation: this resets on server restart and does not share state
 * across multiple server instances/processes. That's acceptable for an
 * initial single-instance Hostinger deployment; if the app is later scaled
 * horizontally, replace this with a shared store (e.g. a `login_attempts`
 * table, already straightforward given the existing MySQL connection).
 * This is a defense-in-depth layer on top of, not a replacement for, the
 * per-account lockout in src/lib/auth/login.ts.
 */
const WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS_PER_WINDOW = 10

const attempts = new Map<string, { count: number; windowStart: number }>()

export function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now })

    return false
  }

  entry.count += 1

  return entry.count > MAX_ATTEMPTS_PER_WINDOW
}
