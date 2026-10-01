import 'server-only'

// CSV import/export for shop_units (migration 0016_shop_inventory.sql).
// Plain CSV rather than a true .xlsx library deliberately — the only
// available Node library for reading .xlsx (`xlsx`/SheetJS) has two
// unpatched vulnerabilities (prototype pollution, ReDoS) with no fix
// available, and this endpoint parses admin-uploaded file content. CSV
// opens and edits fine in Excel and needs no vulnerable parser dependency.
//
// Columns match the reference format given: Stall No., Single/Double,
// Category, Direction, EMD Amount (EMD Amount is optional — a blank cell is
// valid and means no EMD configured for that stall).

export const CSV_COLUMNS = ['Stall No.', 'Single/Double', 'Category', 'Direction', 'EMD Amount'] as const

export type ShopUnitCsvRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string
  direction: string | null
  emdAmountPaise: number | null
}

export type CsvRowError = { rowNumber: number; message: string }

export type ParsedCsv = {
  rows: ShopUnitCsvRow[]
  errors: CsvRowError[]
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function buildCsv(rows: string[][]): string {
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n')
}

/**
 * The downloadable blank template — header row, one example row per real
 * category (so the Category column's exact expected spelling is obvious
 * from the template itself rather than discovered only via a validation
 * error), and an EMD Amount left blank on most rows since it's optional.
 */
export function buildTemplateCsv(categoryNames: string[]): string {
  const exampleRows = categoryNames.map((name, idx) => [
    `S-${100 + idx}`,
    idx % 2 === 0 ? 'Single' : 'Double',
    name,
    '',
    ''
  ])

  return buildCsv([[...CSV_COLUMNS], ...exampleRows])
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

const MAX_IMPORT_ROWS = 2000

/**
 * Parses an uploaded CSV's text content into validated rows. Does NOT touch
 * the database or resolve category names to IDs — that happens in the
 * caller against live category data, since "does this category exist" is a
 * live lookup, not something this pure parsing function should own.
 */
export function parseShopUnitsCsv(text: string): ParsedCsv {
  const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim() !== '')

  if (lines.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, message: 'The file is empty.' }] }
  }

  const header = parseCsvLine(lines[0]).map(h => h.trim())
  const expectedHeader = CSV_COLUMNS as readonly string[]
  const headerMatches = expectedHeader.every((col, idx) => header[idx]?.toLowerCase() === col.toLowerCase())

  if (!headerMatches) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Header row must be exactly: ${expectedHeader.join(', ')}`
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

  const rows: ShopUnitCsvRow[] = []
  const errors: CsvRowError[] = []
  const seenStallNumbers = new Set<string>()

  dataLines.forEach((line, idx) => {
    const rowNumber = idx + 2 // +1 for 0-index, +1 for header row
    const fields = parseCsvLine(line)
    const [stallNumberRaw, shopTypeRaw, categoryNameRaw, directionRaw, emdAmountRaw] = fields

    const stallNumber = (stallNumberRaw ?? '').trim()
    const shopTypeText = (shopTypeRaw ?? '').trim().toLowerCase()
    const categoryName = (categoryNameRaw ?? '').trim()
    const direction = (directionRaw ?? '').trim()
    const emdAmountText = (emdAmountRaw ?? '').trim()

    if (!stallNumber) {
      errors.push({ rowNumber, message: 'Stall No. is required.' })

      return
    }

    if (seenStallNumbers.has(stallNumber.toLowerCase())) {
      errors.push({ rowNumber, message: `Duplicate Stall No. "${stallNumber}" within this file.` })

      return
    }

    seenStallNumbers.add(stallNumber.toLowerCase())

    if (shopTypeText !== 'single' && shopTypeText !== 'double') {
      errors.push({ rowNumber, message: 'Single/Double must be exactly "Single" or "Double".' })

      return
    }

    if (!categoryName) {
      errors.push({ rowNumber, message: 'Category is required.' })

      return
    }

    let emdAmountPaise: number | null = null

    if (emdAmountText !== '') {
      const emdRupees = Number(emdAmountText)

      if (!Number.isFinite(emdRupees) || emdRupees < 0) {
        errors.push({ rowNumber, message: 'EMD Amount must be a non-negative number, or left blank.' })

        return
      }

      emdAmountPaise = Math.round(emdRupees * 100)
    }

    rows.push({
      rowNumber,
      stallNumber,
      shopType: shopTypeText,
      categoryName,
      direction: direction || null,
      emdAmountPaise
    })
  })

  return { rows, errors }
}

export type ShopUnitExportRow = {
  stall_number: string
  shop_type: 'single' | 'double'
  category_name: string
  direction: string | null
  emd_amount_paise: number | null
}

export function buildExportCsv(rows: ShopUnitExportRow[]): string {
  const header = [...CSV_COLUMNS]

  const body = rows.map(row => [
    row.stall_number,
    row.shop_type === 'single' ? 'Single' : 'Double',
    row.category_name,
    row.direction ?? '',
    row.emd_amount_paise !== null ? (row.emd_amount_paise / 100).toString() : ''
  ])

  return buildCsv([header, ...body])
}
