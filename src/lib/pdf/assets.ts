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
// rendered as plain <Text> comes out visibly broken. Every Hindi label/
// paragraph in the Allotment Letter is pre-rendered ONCE, in a sandbox with
// a real browser available, as a PNG with correct shaping (Playwright + the
// project's own Noto Sans Devanagari font), and embedded as a static
// <Image> instead — confirmed necessary via upstream issues (react-pdf
// #856, #1775), both still open with no shaping fix. Regenerate an asset
// only if its text changes (ask Claude to re-render via Playwright).
const pdfLabelCache = new Map<string, string>()

function getPdfLabelBase64(filename: string): string {
  const cached = pdfLabelCache.get(filename)

  if (cached) return cached

  const base64 = readFileSync(path.join(process.cwd(), 'public', 'images', 'pdf-labels', filename)).toString('base64')

  pdfLabelCache.set(filename, base64)

  return base64
}

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

export const getElectricalArrangementsHiBase64 = () => getPdfLabelBase64('electrical-hi.png')
export const getTentArrangementsHiBase64 = () => getPdfLabelBase64('tent-hi.png')
export const getImportantNoticeHeadingHiBase64 = () => getPdfLabelBase64('important-notice-heading-hi.png')
export const getImportantNoticeParagraphHiBase64 = () => getPdfLabelBase64('important-notice-paragraph-hi.png')
export const getArrangementContactHeadingHiBase64 = () => getPdfLabelBase64('arrangement-contact-heading-hi.png')
export const getCompanionDetailsQrBase64 = () => getPdfLabelBase64('companion-details-qr.png')
