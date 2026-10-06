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
