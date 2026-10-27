import 'server-only'

// CSV import/export for shop_units (migration 0016_shop_inventory.sql).
// Plain CSV rather than a true .xlsx library deliberately — the only
// available Node library for reading .xlsx (`xlsx`/SheetJS) has two
// unpatched vulnerabilities (prototype pollution, ReDoS) with no fix
// available, and this endpoint parses admin-uploaded file content. CSV
// opens and edits fine in Excel and needs no vulnerable parser dependency.
//
// Import and export use DIFFERENT column sets (per explicit request,
// 2026-10-28): the amount a stall should cost is always set afterward in the
// admin table's own Add/Edit form ("Stall Amount in ₹", which feeds Direct
// Allotment's payment amount), never via bulk import — so the import
// template/upload has no amount column at all. Export still includes it
// (labeled "Stall Amount" — it's the same emd_amount_paise column/value,
// previously mislabeled "EMD Amount" in this CSV) so admins can see existing
// amounts when reviewing the current inventory.
export const IMPORT_CSV_COLUMNS = ['Booth/Stall No.', 'Single/Double', 'Category', 'Direction', 'Status'] as const
export const EXPORT_CSV_COLUMNS = ['Booth/Stall No.', 'Single/Double', 'Category', 'Direction', 'Stall Amount', 'Status'] as const

// 'reserved' (payment-pending) is deliberately not importable — it only ever
// arises from a real application/direct-allotment payment flow, never from a
// bulk import. Import can only mark a stall Available or hold it for Direct
// Allotment (per explicit request, 2026-10-28).
export type ShopUnitStatus = 'available' | 'reserved_for_direct_allotment'

export type ShopUnitCsvRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string
  direction: string | null
  status: ShopUnitStatus
}

export type CsvRowError = { rowNumber: number; message: string }

export type ParsedCsv = {
  rows: ShopUnitCsvRow[]
  errors: CsvRowError[]
}

// Formula-injection guard matches src/lib/export/csv.ts's toCsvField() — a
// value starting with =, +, -, or @ is treated as a formula by Excel/Sheets
// when this export is opened, so it's prefixed with a literal quote first.
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

export function buildCsv(rows: string[][]): string {
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n')
}

/**
 * The downloadable blank template — header row, one example row per real
 * category (so the Category column's exact expected spelling is obvious
 * from the template itself rather than discovered only via a validation
 * error).
 */
export function buildTemplateCsv(categoryNames: string[]): string {
  const exampleRows = categoryNames.map((name, idx) => [
    `S-${100 + idx}`,
    idx % 2 === 0 ? 'Single' : 'Double',
    name,
    '',
    'Available'
  ])

  return buildCsv([[...IMPORT_CSV_COLUMNS], ...exampleRows])
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
  const expectedHeader = IMPORT_CSV_COLUMNS as readonly string[]
  // The first column used to be called "Stall No." — files with either name
  // are accepted. A file still using the old 6-column format (with an
  // EMD/Stall Amount column before Status) is also accepted — that column is
  // simply ignored, since the amount is no longer set via import at all; its
  // value is skipped by shifting what "Status" is read from accordingly.
  const first4Match = expectedHeader.slice(0, 4).every((col, idx) => {
    const got = header[idx]?.toLowerCase()

    return got === col.toLowerCase() || (idx === 0 && got === 'stall no.')
  })

  const hasOldAmountColumn = (header[4]?.toLowerCase() ?? '') === 'stall amount' || (header[4]?.toLowerCase() ?? '') === 'emd amount'
  const statusColumnIndex = hasOldAmountColumn ? 5 : 4
  const hasStatusColumn = (header[statusColumnIndex]?.toLowerCase() ?? '') === 'status'
  const headerMatches = first4Match && (header.length === 4 || hasStatusColumn)

  if (!headerMatches) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Header row must be exactly: ${expectedHeader.join(', ')} (Status column is optional).`
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
    const [stallNumberRaw, shopTypeRaw, categoryNameRaw, directionRaw] = fields
    const statusRaw = fields[statusColumnIndex]

    const stallNumber = (stallNumberRaw ?? '').trim()
    const shopTypeText = (shopTypeRaw ?? '').trim().toLowerCase()
    const categoryName = (categoryNameRaw ?? '').trim()
    const direction = (directionRaw ?? '').trim()
    const statusText = (statusRaw ?? '').trim().toLowerCase()

    if (!stallNumber) {
      errors.push({ rowNumber, message: 'Booth/Stall No. is required.' })

      return
    }

    if (seenStallNumbers.has(stallNumber.toLowerCase())) {
      errors.push({ rowNumber, message: `Duplicate Booth/Stall No. "${stallNumber}" within this file.` })

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

    let status: ShopUnitStatus = 'available' // the caller overrides this to 'reserved_for_direct_allotment' for a custom/auto-created category's rows

    if (statusText !== '' && statusText !== 'available') {
      if (statusText !== 'reserved for direct allotment') {
        errors.push({
          rowNumber,
          message: 'Status must be "Available" or "Reserved for Direct Allotment", or left blank.'
        })

        return
      }

      status = 'reserved_for_direct_allotment'
    }

    rows.push({
      rowNumber,
      stallNumber,
      shopType: shopTypeText,
      categoryName,
      direction: direction || null,
      status
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
  status: string
}

const EXPORT_STATUS_LABEL: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved for Payment',
  reserved_for_direct_allotment: 'Reserved for Direct Allotment',
  allotted: 'Allotted',
  cancelled: 'Cancelled',
  rejected: 'Rejected'
}

export function buildExportCsv(rows: ShopUnitExportRow[]): string {
  const header = [...EXPORT_CSV_COLUMNS]

  const body = rows.map(row => [
    row.stall_number,
    row.shop_type === 'single' ? 'Single' : 'Double',
    row.category_name,
    row.direction ?? '',
    row.emd_amount_paise !== null ? (row.emd_amount_paise / 100).toString() : '',
    EXPORT_STATUS_LABEL[row.status] ?? row.status
  ])

  return buildCsv([header, ...body])
}
