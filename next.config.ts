import type { NextConfig } from 'next'

// Content-Security-Policy is set per-request in middleware.ts instead of
// here, because it needs a fresh random nonce on every request to allow
// Next.js's own inline hydration scripts to run — a static CSP without a
// nonce blocks React hydration entirely (every button/link becomes
// non-interactive while the page still looks fine). See middleware.ts for
// the full explanation and the nonce-based policy.
// X-Frame-Options is set per-request in src/proxy.ts (DENY, except SAMEORIGIN
// for the document-preview route that the preview dialog frames).
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : [])
]

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH ?? '',
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  compress: true,

  // pdfkit (used internally by @react-pdf/renderer, src/lib/pdf/react-templates.tsx)
  // loads its standard-font .afm files via a `require()` relative to its own
  // package directory AT RUNTIME, which Next.js's build-time file tracer
  // cannot see statically — it silently excluded those files from the
  // production deploy, causing "Cannot find module
  // '.../pdfkit/js/standard-fonts/Helvetica.cjs'" in production (confirmed
  // live on Hostinger) while working fine in local dev, where the full
  // node_modules tree is always present. Marking both packages external
  // makes Next.js leave them as plain `require()` calls resolved against
  // the real node_modules tree at runtime, instead of bundling/tracing them.
  serverExternalPackages: ['@react-pdf/renderer', 'pdfkit', 'fontkit'],

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: SECURITY_HEADERS
    }
  ]
}

export default nextConfig
