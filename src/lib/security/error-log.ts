import 'server-only'

/**
 * Server-side-only error logging. Never returned to the client — API routes
 * always respond with a generic message (see .ai/SECURITY.md Section 17:
 * "generic error messages to public users, detailed errors only in
 * protected server logs"). Logs to stderr via console.error, which is
 * captured by the Node process/hosting platform's log pipeline.
 *
 * Callers must not pass raw request bodies, passwords, OTPs, full Aadhaar
 * numbers, or file contents into `context` — only identifiers (application
 * id, category slug, etc.) useful for triage.
 */
export function logServerError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  console.error(`[${scope}]`, message, context ?? {}, stack ?? '')
}
