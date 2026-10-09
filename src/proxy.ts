import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

import { isComingSoonEnabled } from '@/lib/site/coming-soon'

const SESSION_COOKIE_NAME = 'kdb_admin_session'

/**
 * Fast-path session presence check. This ONLY verifies the JWT signature and
 * expiry — it does NOT check the database for revocation, so it's a single
 * cheap in-memory verification rather than a DB round-trip on every request.
 * The authoritative check (revocation, disabled user, current role) happens
 * again in src/app/(admin)/layout.tsx via getSession(), which is the actual
 * security boundary. This proxy is the fast-path redirect for the common
 * case (no cookie / expired / tampered token at all) so unauthenticated
 * users never even reach a render.
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
function buildContentSecurityPolicy(nonce: string, allowSelfFraming: boolean): string {
  const isDev = process.env.NODE_ENV !== 'production'

  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  return [
    "default-src 'self'",

    // Razorpay Checkout.js (loaded on the payment page, see
    // PaymentPageView.tsx) needs its own script origin, opens its payment
    // form in an iframe from the same origin, calls its API to create/
    // complete a payment, and sends an analytics beacon to lumberjack —
    // all blocked by a bare 'self' CSP, which is exactly what happened live
    // (reported: "Connecting to 'https://lumberjack.razorpay.com/...'
    // violates ... connect-src 'self'"). See
    // https://razorpay.com/docs/payments/payment-gateway/web-integration/hosted/build-integration/#3-content-security-policy-csp
    // google.com/gstatic.com: the reCAPTCHA v3 invisible widget on the
    // application Review page (RecaptchaWidget.tsx) — same reasoning as the
    // Razorpay origin above it, a bare 'self' CSP silently blocks the
    // widget's script and its frame with no visible error beyond the
    // submission never getting a token.
    `${scriptSrc} https://checkout.razorpay.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,

    // github.io: the floating chatbot widget (FloatingChatbot.tsx) embeds a
    // third-party-hosted chat page in an iframe — without this, the iframe
    // is silently blocked exactly like the earlier Razorpay CSP bug (see the
    // frame-src comment above this one), with no visible error beyond the
    // iframe staying blank.
    // blob: on frame-src: the in-page document preview dialog
    // (DocumentsStep.tsx / ApplicationDocumentsSection.tsx) fetches an
    // uploaded PDF as a blob and renders it in an <iframe src="blob:...">
    // instead of opening a new tab — without this, the iframe is silently
    // blocked exactly like the other frame-src entries above.
    "frame-src 'self' blob: https://api.razorpay.com https://checkout.razorpay.com https://vksinglakkr.github.io https://www.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.razorpay.com",
    "font-src 'self' https://fonts.gstatic.com",

    // blob: on img-src: same preview dialog renders an uploaded IMAGE
    // document via <img src="blob:...">  — reported live as a broken-image
    // icon with no console error, since a CSP img-src block on a blob: URL
    // fails silently rather than throwing.
    "img-src 'self' data: blob: https://cdn.razorpay.com",
    "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://www.google.com",

    // 'self' only for the document-preview route (see isDocumentPreview in
    // proxy()): the admin/applicant preview dialog frames
    // /api/documents/:id/preview from the same origin, and 'none' made the
    // browser refuse it — shown as a broken-page icon in the dialog.
    allowSelfFraming ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
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
/**
 * Whole-site "Coming Soon" gate — switched on/off by an admin from
 * /admin/settings/coming-soon (site_mode_settings), read here with a short
 * in-memory cache so most requests skip the DB round-trip entirely.
 *
 * This file (`src/proxy.ts`, Next.js 16's replacement for `middleware.ts`)
 * always runs on the Node.js runtime — unlike old-style Next.js middleware,
 * it was never limited to the Edge runtime (confirmed by trying to force
 * `runtime: 'nodejs'` in the exported config below: Next.js rejects it with
 * "Proxy always runs on Node.js runtime"). That means isComingSoonEnabled()
 * — which uses mysql2, a real TCP client — can be called directly here. An
 * earlier version of this file didn't realize that and assumed it was
 * Edge-only (same mistaken assumption behind hasValidSessionToken() above's
 * comment, which has since been corrected), so it worked around a
 * non-existent constraint by having the proxy fetch() its own
 * /api/site-status route over the network — that self-referential HTTP
 * call turned out to silently fail in production (shared hosting commonly
 * blocks or limits a server calling back into itself), and since the check
 * fails open (false) on any error to avoid locking out visitors on a DB
 * hiccup, Coming Soon mode appeared permanently OFF to real visitors no
 * matter what the admin toggle or the database said. Calling the DB
 * function directly removes that network hop — and that whole failure
 * mode — completely. The now-unused /api/site-status route was deleted.
 *
 * The admin panel and all /api routes stay reachable either way, so an
 * admin can still log in and work (and so the admin's own API calls from
 * /admin/* pages keep functioning) while every other route redirects to
 * /coming-soon.
 *
 * A logged-in admin also bypasses the gate on the public site itself —
 * otherwise nobody could preview the live application form/pages while
 * Coming Soon is on (reported live: "main form dekhna hai to vo kaise
 * dekhenge?"). Reuses the same admin session cookie already checked below
 * for /admin routes, so there's no separate preview secret to manage —
 * log in once at /admin/login and the public site becomes visible too,
 * in that same browser, while everyone else still sees /coming-soon.
 */
const COMING_SOON_CACHE_MS = 5000
let comingSoonCache: { value: boolean; fetchedAt: number } | null = null

/** Fails open (false) if the DB is unreachable — never lock visitors out on a read error. */
async function isComingSoonOn(): Promise<boolean> {
  const now = Date.now()

  if (comingSoonCache && now - comingSoonCache.fetchedAt < COMING_SOON_CACHE_MS) return comingSoonCache.value

  const value = await isComingSoonEnabled()

  comingSoonCache = { value, fetchedAt: now }

  return value
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api') && pathname !== '/coming-soon' && (await isComingSoonOn())) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
    const isLoggedInAdmin = await hasValidSessionToken(sessionToken)

    if (!isLoggedInAdmin) {
      return NextResponse.redirect(new URL('/coming-soon', request.url))
    }
  }

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
  const isDocumentPreview = /^\/api\/documents\/\d+\/preview$/.test(pathname)
  const csp = buildContentSecurityPolicy(nonce, isDocumentPreview)

  const requestHeaders = new Headers(request.headers)

  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  response.headers.set('Content-Security-Policy', csp)

  // Legacy equivalent of frame-ancestors; set here (not next.config.ts) so it can differ per route.
  response.headers.set('X-Frame-Options', isDocumentPreview ? 'SAMEORIGIN' : 'DENY')

  return response
}

export const config = {
  matcher: [
    // Run on every route except static assets, so the CSP header (and admin
    // auth check where applicable) applies site-wide.
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}
