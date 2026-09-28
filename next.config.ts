import type { NextConfig } from 'next'

// Content-Security-Policy is set per-request in middleware.ts instead of
// here, because it needs a fresh random nonce on every request to allow
// Next.js's own inline hydration scripts to run — a static CSP without a
// nonce blocks React hydration entirely (every button/link becomes
// non-interactive while the page still looks fine). See middleware.ts for
// the full explanation and the nonce-based policy.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : [])
]

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH ?? '',
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  headers: async () => [
    {
      source: '/:path*',
      headers: SECURITY_HEADERS
    }
  ]
}

export default nextConfig
