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

  // Next.js 16.4+ auto-generates/re-creates an AGENTS.md on every `next dev`
  // run (see node_modules/next/dist/server/lib/generate-agent-files.js) —
  // disabled since this repo already has its own CLAUDE.md as the
  // authoritative AI-instructions file; a second auto-regenerating one would
  // just be noise in every diff and a potential source of conflicting
  // guidance for future sessions.
  agentRules: false,

  // pdfkit (used internally by @react-pdf/renderer, src/lib/pdf/react-templates.tsx)
  // loads its standard-font .cjs modules via a `require()` relative to its
  // own package directory AT RUNTIME, which Next.js's build-time file
  // tracer cannot see statically — it kept excluding those files from the
  // production deploy ("Cannot find module '.../pdfkit/js/standard-fonts/
  // Helvetica.cjs'", confirmed live on Hostinger), even after marking the
  // packages external (below), because `serverExternalPackages` only stops
  // Next.js from BUNDLING a package — it does not, by itself, widen what
  // the tracer decides to ship for it. `outputFileTracingIncludes` is the
  // forceful fix: it explicitly adds these files to Next's own trace
  // output for every route, and most Node hosting panels (including
  // Hostinger's) build their deployable file set FROM that trace output,
  // so whatever it omits never reaches the server at all regardless of
  // what a plain `npm install` would have included.
  serverExternalPackages: ['@react-pdf/renderer', 'pdfkit', 'fontkit'],
  outputFileTracingIncludes: {
    '/**': ['./node_modules/pdfkit/js/**/*', './node_modules/fontkit/**/*']
  },

  // The production build server (Hostinger) reports a host-level CPU count
  // (seen: 63) to the container, but the container's actual process/thread
  // limit is far lower — Next.js's "Collecting page data" step spawns one
  // native worker per detected CPU by default, and asking for 63 on a
  // container that can't support that many crashed the build outright
  // ("OS can't spawn worker thread: Resource temporarily unavailable (os
  // error 11)" — a tokio/Rust panic, not a Node OOM). Capping `cpus` keeps
  // the worker count sane regardless of what the host reports.
  experimental: {
    cpus: 2
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400
  },
  redirects: async () => [
    {
      source: '/:path*',
      has: [
        {
          type: 'host',
          value: 'www.thanesarinfo.com'
        }
      ],
      destination: 'https://thanesarinfo.com/:path*',
      permanent: true
    }
  ],
  headers: async () => [
    {
      source: '/:path*',
      headers: SECURITY_HEADERS
    }
  ]
}

export default nextConfig
