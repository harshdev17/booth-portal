import 'server-only'

// CSV parsing for the Admin's "Auction Results" bulk upload (migration
// 0077's Auction Payment Flow) — after KDB's physical auction, the admin
// uploads a CSV of everyone who won a stall, with the SPECIFIC final amount
// each person owes (varies per person, decided at the auction). Plain CSV
// rather than .xlsx for the exact same reason shop-units-csv.ts gives: the
// only available Node .xlsx library (xlsx/SheetJS) has two unpatched
// vulnerabilities (prototype pollution, ReDoS) with no fix available, and
// this endpoint parses admin-uploaded file content. CSV opens and edits
// fine in Excel and needs no vulnerable parser dependency.
export const AUCTION_RESULTS_CSV_COLUMNS = ['Application Number', 'Stall Number', 'Final Auction Amount'] as const

export type AuctionResultCsvRow = {
  rowNumber: number
  applicationNumber: string
  stallNumber: string
  finalAmountRupees: number
}

export type CsvRowError = { rowNumber: number; message: string }

export type ParsedAuctionResultsCsv = {
  rows: AuctionResultCsvRow[]
  errors: CsvRowError[]
}

/** Parses one CSV line respecting double-quoted fields (which may contain commas) — same logic as shop-units-csv.ts's parseCsvLine. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)

  return fields
}

const MAX_IMPORT_ROWS = 2000

/**
 * Parses an uploaded CSV's text content into validated rows. Does NOT touch
 * the database or resolve application numbers to ids/validate their status
 * — that happens in the caller against live data, the same separation
 * shop-units-csv.ts's parseShopUnitsCsv() uses ("does this exist" is a live
 * lookup, not something a pure parsing function should own).
 */
export function parseAuctionResultsCsv(text: string): ParsedAuctionResultsCsv {
  const cleanedText = text.replace(/^﻿/, '').trim()
  const lines = cleanedText.split(/\r\n|\r|\n/).filter(line => line.trim() !== '')

  if (lines.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, message: 'The file is empty.' }] }
  }

  const rawHeaders = parseCsvLine(lines[0]).map(h => h.replace(/^﻿/, '').trim())
  const colIndex = new Map<string, number>()
  rawHeaders.forEach((h, idx) => {
    const rawClean = h.toLowerCase().trim()
    const stripped = rawClean.replace(/[^\w\s/.-]/g, '').trim()
    colIndex.set(rawClean, idx)
    colIndex.set(stripped, idx)
  })

  const findCol = (keywords: string[]): number => {
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase()
      for (const [key, idx] of colIndex.entries()) {
        if (key === lowerKw) return idx
      }
    }
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase()
      for (const [key, idx] of colIndex.entries()) {
        if (key.includes(lowerKw)) return idx
      }
    }
    return -1
  }

  const appNoCol = findCol(['application number', 'application no.', 'application no', 'app number', 'app no.', 'app no'])
  const stallCol = findCol(['stall number', 'stall no.', 'stall no', 'booth number', 'booth no.', 'booth no'])
  const amountCol = findCol([
    'final auction amount',
    'auction amount',
    'final amount',
    'amount',
    'final auction amount (rs)',
    'amount (rs)'
  ])

  if (appNoCol === -1 || stallCol === -1 || amountCol === -1) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message:
            'Could not identify "Application Number", "Stall Number", or "Final Auction Amount" columns. Please verify column headers.'
        }
      ]
    }
  }

  const dataLines = lines.slice(1)

  if (dataLines.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: `Too many rows (max ${MAX_IMPORT_ROWS} per import).` }]
    }
  }

  const rows: AuctionResultCsvRow[] = []
  const errors: CsvRowError[] = []
  const seenAppNumbers = new Set<string>()

  dataLines.forEach((line, idx) => {
    const rowNumber = idx + 2
    const fields = parseCsvLine(line)

    const applicationNumber = (fields[appNoCol] ?? '').trim()
    const stallNumber = (fields[stallCol] ?? '').trim()
    const amountRaw = (fields[amountCol] ?? '').trim().replace(/[^\d.]/g, '')

    if (!applicationNumber) {
      errors.push({ rowNumber, message: 'Application Number is required.' })
      return
    }

    if (seenAppNumbers.has(applicationNumber.toLowerCase())) {
      errors.push({ rowNumber, message: `Duplicate Application Number "${applicationNumber}" within this file.` })
      return
    }

    seenAppNumbers.add(applicationNumber.toLowerCase())

    if (!stallNumber) {
      errors.push({ rowNumber, message: 'Stall Number is required.' })
      return
    }

    const finalAmountRupees = Math.round(Number(amountRaw) || 0)

    if (finalAmountRupees <= 0) {
      errors.push({ rowNumber, message: 'Final Auction Amount must be a positive number.' })
      return
    }

    rows.push({ rowNumber, applicationNumber, stallNumber, finalAmountRupees })
  })

  return { rows, errors }
}
