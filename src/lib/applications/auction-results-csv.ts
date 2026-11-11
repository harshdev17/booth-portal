import 'server-only'

// CSV import for an auction category's physical-auction results (migration
// 0075_auction_payment_flow.sql). Plain CSV, not .xlsx — same reasoning as
// shop-units-csv.ts: the only Node .xlsx library has unpatched
// vulnerabilities and this parses admin-uploaded file content.
//
// One row per winner: which application won, which stall they get, and the
// final amount settled at the (offline, in-person) auction — this amount
// genuinely varies per person, so it's supplied here rather than configured
// anywhere ahead of time.
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

// Formula-injection guard matches shop-units-csv.ts's escapeCsvField().
function escapeCsvField(value: string): string {
  let out = value

  if (/^[=+\-@\t\r]/.test(out)) {
    out = `'${out}`
  }

  if (out.includes(',') || out.includes('"') || out.includes('\n')) {
    return `"${out.replace(/"/g, '""')}"`
  }

  return out
}

function buildCsv(rows: string[][]): string {
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n')
}

/** The downloadable blank template — header row plus one example row. */
export function buildAuctionResultsTemplateCsv(): string {
  return buildCsv([[...AUCTION_RESULTS_CSV_COLUMNS], ['IGM-2026-000123', 'S-101', '55000']])
}

/** Parses one CSV line respecting double-quoted fields (which may contain commas). Matches shop-units-csv.ts. */
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

const MAX_IMPORT_ROWS = 500

/**
 * Parses an uploaded CSV's text content into validated rows. Does NOT touch
 * the database — resolving each application/stall against live data and
 * checking their current eligibility happens in the caller, same separation
 * as parseShopUnitsCsv().
 */
export function parseAuctionResultsCsv(text: string): ParsedAuctionResultsCsv {
  const cleaned = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const lines = cleaned.split('\n').filter(line => line.trim().length > 0)

  if (lines.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, message: 'The file is empty.' }] }
  }

  const header = parseCsvLine(lines[0]).map(h => h.trim())
  const expected = AUCTION_RESULTS_CSV_COLUMNS as readonly string[]
  const headerMatches = expected.every((col, idx) => header[idx]?.toLowerCase() === col.toLowerCase())

  if (!headerMatches) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: `Header row must be exactly: ${expected.join(', ')}` }]
    }
  }

  const dataLines = lines.slice(1)

  if (dataLines.length > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ rowNumber: 0, message: `Too many rows (max ${MAX_IMPORT_ROWS} per upload).` }] }
  }

  const rows: AuctionResultCsvRow[] = []
  const errors: CsvRowError[] = []
  const seenApplicationNumbers = new Set<string>()
  const seenStallNumbers = new Set<string>()

  dataLines.forEach((line, idx) => {
    const rowNumber = idx + 2 // +1 for 0-index, +1 for the header row
    const fields = parseCsvLine(line)
    const applicationNumber = (fields[0] ?? '').trim()
    const stallNumber = (fields[1] ?? '').trim()
    const amountRaw = (fields[2] ?? '').trim()

    if (!applicationNumber) {
      errors.push({ rowNumber, message: 'Application Number is required.' })

      return
    }

    if (!stallNumber) {
      errors.push({ rowNumber, message: 'Stall Number is required.' })

      return
    }

    const finalAmountRupees = Number(amountRaw)

    if (!amountRaw || !Number.isFinite(finalAmountRupees) || finalAmountRupees <= 0) {
      errors.push({ rowNumber, message: 'Final Auction Amount must be a positive number.' })

      return
    }

    if (seenApplicationNumbers.has(applicationNumber)) {
      errors.push({ rowNumber, message: `Application Number "${applicationNumber}" appears more than once in this file.` })

      return
    }

    if (seenStallNumbers.has(stallNumber)) {
      errors.push({ rowNumber, message: `Stall Number "${stallNumber}" appears more than once in this file.` })

      return
    }

    seenApplicationNumbers.add(applicationNumber)
    seenStallNumbers.add(stallNumber)

    rows.push({ rowNumber, applicationNumber, stallNumber, finalAmountRupees })
  })

  return { rows, errors }
}
