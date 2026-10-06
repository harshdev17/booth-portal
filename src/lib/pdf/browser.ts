import { existsSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import path from 'node:path'

import 'server-only'

import type { Browser } from 'playwright-core'
import { chromium } from 'playwright-core'

// Why a real browser instead of a PDF-drawing library: @react-pdf/renderer
// (tried first) silently truncates Devanagari text mid-word on certain
// vowel-sign sequences — confirmed live with "ईमेल" rendering as "ईम" and
// "कोई नहीं" as "कोई नह" — because it doesn't do full Indic-script shaping.
// A real browser's text engine (the same one that already renders Hindi
// correctly throughout this site) doesn't have that problem, so PDF
// generation renders the exact same HTML/CSS as the on-screen print pages
// through a headless Chromium and lets the browser do the shaping.
//
// Production note: this requires a Chromium binary the server can execute.
// Set CHROMIUM_EXECUTABLE_PATH if one is pre-installed, or run
// `npx playwright install --with-deps chromium` during deploy so
// chromium.launch() finds Playwright's own managed copy automatically. A
// restrictive shared-hosting plan that can't spawn a browser process at all
// cannot support this feature — see .ai/OPEN_QUESTIONS.md.
function resolveExecutablePath(): string | undefined {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) return process.env.CHROMIUM_EXECUTABLE_PATH

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH

  if (!browsersPath || !existsSync(browsersPath)) return undefined

  // Playwright's installed-browser directory names are version-stamped
  // (e.g. chromium-1194), so this is found by pattern rather than a pinned
  // version — a pinned folder name would break the next time Playwright's
  // managed browser version bumps.
  const match = readdirSync(browsersPath)
    .filter(name => /^chromium-\d+$/.test(name))
    .sort()
    .at(-1)

  if (!match) return undefined

  const candidate = path.join(browsersPath, match, 'chrome-linux', 'chrome')

  return existsSync(candidate) ? candidate : undefined
}

let browserPromise: Promise<Browser> | null = null

// Launched once per server process and reused — a cold Chromium launch
// costs several hundred ms, not worth paying on every PDF download.
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ executablePath: resolveExecutablePath() }).catch(error => {
      browserPromise = null // let the next request retry instead of caching a permanent failure

      throw error
    })
  }

  return browserPromise
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setContent(html, { waitUntil: 'networkidle' })

    return await page.pdf({ format: 'A4', printBackground: true })
  } finally {
    await page.close()
  }
}
