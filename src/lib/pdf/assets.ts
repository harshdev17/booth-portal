import { readFileSync } from 'node:fs'
import path from 'node:path'

// Base64-embedded rather than referenced by file:// path or site URL: the
// headless browser renders setContent() HTML with no real page URL to
// resolve relative/file paths against, and a data URI needs nothing beyond
// what's already loaded in the Node process to resolve correctly. Read once
// per process and cached — these are only ever read for a PDF render, not
// on every request to every page.
let devanagariFontBase64: string | null = null
let devanagariFontBoldBase64: string | null = null
let logoBase64: string | null = null

// @react-pdf/renderer has no complex-script shaping engine (no GSUB/GPOS,
// no HarfBuzz) — it can draw individual Devanagari glyphs from a registered
// font but cannot form conjuncts or reposition matras, so any Hindi text
// rendered as plain <Text> comes out visibly broken. These two short labels
// (the Allotment Letter's Arrangement Contact section) are pre-rendered
// ONCE, in a sandbox with a real browser available, as small PNGs with
// correct shaping, and embedded as static <Image> elements instead —
// confirmed necessary via upstream issues (react-pdf #856, #1775), both
// still open with no shaping fix. Regenerate these only if the label text
// itself changes (see scripts/ or ask Claude to re-render via Playwright).
let electricalArrangementsHiBase64: string | null = null
let tentArrangementsHiBase64: string | null = null

export function getDevanagariFontBase64(): string {
  if (devanagariFontBase64 === null) {
    devanagariFontBase64 = readFileSync(
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf')
    ).toString('base64')
  }

  return devanagariFontBase64
}

export function getDevanagariFontBoldBase64(): string {
  if (devanagariFontBoldBase64 === null) {
    devanagariFontBoldBase64 = readFileSync(
      path.join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Bold.ttf')
    ).toString('base64')
  }

  return devanagariFontBoldBase64
}

export function getLogoBase64(): string {
  if (logoBase64 === null) {
    logoBase64 = readFileSync(path.join(process.cwd(), 'public', 'images', 'public', 'logo.png')).toString('base64')
  }

  return logoBase64
}

export function getElectricalArrangementsHiBase64(): string {
  if (electricalArrangementsHiBase64 === null) {
    electricalArrangementsHiBase64 = readFileSync(
      path.join(process.cwd(), 'public', 'images', 'pdf-labels', 'electrical-hi.png')
    ).toString('base64')
  }

  return electricalArrangementsHiBase64
}

export function getTentArrangementsHiBase64(): string {
  if (tentArrangementsHiBase64 === null) {
    tentArrangementsHiBase64 = readFileSync(
      path.join(process.cwd(), 'public', 'images', 'pdf-labels', 'tent-hi.png')
    ).toString('base64')
  }

  return tentArrangementsHiBase64
}
