import 'server-only'

// CSV import for recording live-auction results (migration 0077). The
// auction itself happens offline/in-person — this file only parses the
// admin's post-auction upload: which applicant won which stall at what
// final price. Plain CSV for the same reason as shop-units-csv.ts: the only
// available .xlsx parser (`xlsx`/SheetJS) has unpatched vulnerabilities and
// this endpoint parses admin-uploaded file content.
export const AUCTION_RESULTS_CSV_COLUMNS = ['Application Number', 'Booth/Stall No.', 'Final Amount'] as const

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

/** Parses one CSV line respecting double-quoted fields (which may contain commas). */
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
 * the database or resolve application numbers to IDs — that happens in the
 * caller against live application data, since "does this application exist
 * and is it actually auction_won" is a live lookup, not something this pure
 * parsing function should own.
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
    colIndex.set(h.toLowerCase().trim(), idx)
  })

  const findCol = (keywords: string[]): number => {
    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase()
      for (const [key, idx] of colIndex.entries()) {
        if (key === lowerKw || key.includes(lowerKw)) return idx
      }
    }

    return -1
  }

  const appCol = findCol(['application number', 'application no.', 'application no', 'app no', 'appno'])
  const stallCol = findCol(['booth/stall no.', 'booth/stall no', 'stall no.', 'stall no', 'stall number', 'booth number'])
  const amountCol = findCol(['final amount', 'auction amount', 'winning amount', 'amount'])

  if (appCol === -1 || stallCol === -1) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: 'Could not identify "Application Number" or "Booth/Stall No." columns. Please verify column headers.' }]
    }
  }

  const dataLines = lines.slice(1)

  if (dataLines.length > MAX_IMPORT_ROWS) {
    return { rows: [], errors: [{ rowNumber: 0, message: `Too many rows (max ${MAX_IMPORT_ROWS} per import).` }] }
  }

  const rows: AuctionResultCsvRow[] = []
  const errors: CsvRowError[] = []
  const seenApplicationNumbers = new Set<string>()

  dataLines.forEach((line, idx) => {
    const rowNumber = idx + 2
    const fields = parseCsvLine(line)

    const applicationNumber = (fields[appCol] ?? '').trim()
    const stallNumber = (fields[stallCol] ?? '').trim()
    const amountRaw = amountCol !== -1 ? (fields[amountCol] ?? '').trim().replace(/[^\d.]/g, '') : ''

    if (!applicationNumber) {
      errors.push({ rowNumber, message: 'Application Number is required.' })

      return
    }

    if (seenApplicationNumbers.has(applicationNumber.toLowerCase())) {
      errors.push({ rowNumber, message: `Duplicate Application Number "${applicationNumber}" within this file.` })

      return
    }

    seenApplicationNumbers.add(applicationNumber.toLowerCase())

    if (!stallNumber) {
      errors.push({ rowNumber, message: 'Booth/Stall No. is required.' })

      return
    }

    const finalAmountRupees = Math.max(0, Math.round(Number(amountRaw) || 0))

    if (!amountRaw || finalAmountRupees <= 0) {
      errors.push({ rowNumber, message: 'Final Amount must be a positive number.' })

      return
    }

    rows.push({ rowNumber, applicationNumber, stallNumber, finalAmountRupees })
  })

  return { rows, errors }
}
