import 'server-only'

/**
 * Extracts client IP/user-agent from a Request in a Route Handler. Trusts
 * the hosting reverse proxy to set x-forwarded-for/x-real-ip correctly —
 * this is not cryptographically verified client identity, only a
 * best-effort value for rate limiting and audit logging (see
 * src/app/server/auth-actions.ts for the equivalent used in server actions).
 */
export function getRequestMeta(request: Request): { ipAddress?: string; userAgent?: string } {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = request.headers.get('x-client-ip')

  const ipAddress =
    cfConnectingIp?.trim() ||
    (forwardedFor ? forwardedFor.split(',')[0].trim() : undefined) ||
    realIp?.trim() ||
    clientIp?.trim() ||
    undefined

  const userAgent = request.headers.get('user-agent') ?? undefined

  return { ipAddress, userAgent }
}

