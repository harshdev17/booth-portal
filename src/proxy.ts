import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE_NAME = 'kdb_admin_session'

/**
 * Edge-safe session presence check. This ONLY verifies the JWT signature and
 * expiry — it does NOT check the database for revocation (jose in the edge
 * runtime can't reach MySQL). The authoritative check (revocation, disabled
 * user, current role) happens again in src/app/(admin)/layout.tsx via
 * getSession(), which is the actual security boundary. This proxy is the
 * fast-path redirect for the common case (no cookie / expired / tampered
 * token at all) so unauthenticated users never even reach a render.
 */
async function hasValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false

  const secret = process.env.SESSION_SECRET

  if (!secret || secret.length < 32) return false

  try {
    await jwtVerify(token, new TextEncoder().encode(secret))

    return true
  } catch {
    return false
  }
}

/**
 * Content-Security-Policy, generated per-request with a random nonce.
 *
 * Next.js injects its own inline bootstrap/hydration <script> tags on every
 * page (this is how React hydrates in the App Router) — a strict
 * `script-src 'self'` with no nonce blocks ALL of them, silently breaking
 * every interactive control on the page (buttons, links, forms) while the
 * HTML still renders fine. The fix is a nonce, not `'unsafe-inline'` — a
 * nonce is regenerated on every single request and only matches the
 * specific inline scripts Next.js emits for THAT response, so it does not
 * open the door to arbitrary injected scripts the way `'unsafe-inline'`
 * would.
 *
 * Next.js automatically reads the nonce back out of this response header
 * (it looks for a `'nonce-...'` token inside `script-src`) and applies it
 * to the inline scripts it injects — see
 * https://nextjs.org/docs/app/guides/content-security-policy. No manual
 * wiring into layout.tsx is required.
 */
function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
}

/**
 * IMPORTANT — file location: Next.js 16's dev bundler resolves this file
 * relative to the App Router root's PARENT directory
 * (node_modules/next/dist/esm/server/lib/router-utils/setup-dev-bundler.js:
 * `getPossibleMiddlewareFilenames(path.join(rootDir, '..'), ...)`, where
 * `rootDir` is `src/app` in this project). That means this file must live
 * at `src/proxy.ts`, NOT at the project root — a root-level `proxy.ts` (or
 * `middleware.ts`) is silently never discovered or executed, with no error
 * or warning, while `next.config.ts`-level headers keep working fine. This
 * caused a real production-affecting bug here: an unrelated CSP header
 * added for hardening blocked all client-side hydration (no button/link on
 * any page was clickable) because the middleware meant to supply a
 * per-request nonce never ran, and — more importantly — the admin-area
 * auth check below never ran either; the app only stayed protected because
 * of the separate defense-in-depth session check in
 * src/app/(admin)/layout.tsx. Do not move this file back to the project
 * root, and do not reintroduce a `middleware.ts`/`proxy.ts` at the root.
 *
 * Also note: Next.js 16 renamed the `middleware` file/export convention to
 * `proxy` (a root/src-level `middleware.ts` triggers a deprecation warning
 * and, in this Turbopack dev setup, can leave a stale reference that
 * breaks routing with "Could not parse module 'middleware.ts', file not
 * found" once removed — always use `proxy.ts` + `export function proxy`).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminAuthRoute = pathname.startsWith('/admin/login')
  const isProtectedAdminRoute = pathname.startsWith('/admin') && !isAdminAuthRoute

  if (isProtectedAdminRoute) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const valid = await hasValidSessionToken(token)

    if (!valid) {
      const loginUrl = new URL('/admin/login', request.url)

      return NextResponse.redirect(loginUrl)
    }
  }

  const nonce = crypto.randomUUID().replace(/-/g, '')
  const csp = buildContentSecurityPolicy(nonce)

  const requestHeaders = new Headers(request.headers)

  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    // Run on every route except static assets, so the CSP header (and admin
    // auth check where applicable) applies site-wide.
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}
