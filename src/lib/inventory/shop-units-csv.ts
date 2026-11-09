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
export const STANDARD_IMPORT_CSV_COLUMNS = ['Booth/Stall No.', 'Single/Double', 'Category', 'Direction', 'Status'] as const

export const DIRECT_ALLOTMENT_CSV_COLUMNS = [
  'Booth/Stall No.',
  'Single/Double',
  'Category',
  'Direction',
  'Status',
  'Allottee Name',
  'Contact Person',
  'Father Name',
  'Mobile Number',
  'Aadhaar Number',
  'Address',
  'Police Station',
  'Email',
  'Work Purpose',
  'Stall Amount'
] as const

export const IMPORT_CSV_COLUMNS = DIRECT_ALLOTMENT_CSV_COLUMNS
export const EXPORT_CSV_COLUMNS = ['Booth/Stall No.', 'Single/Double', 'Category', 'Direction', 'Stall Amount', 'Status'] as const

export type ShopUnitStatus = 'available' | 'reserved_for_direct_allotment' | 'allotted' | 'reserved'

export type ShopUnitCsvRow = {
  rowNumber: number
  stallNumber: string
  shopType: 'single' | 'double'
  categoryName: string
  direction: string | null
  status: ShopUnitStatus
  explicitStatus?: string | null
  // Direct Allotment optional fields
  allotteeName?: string | null
  contactPerson?: string | null
  fatherName?: string | null
  mobileNumber?: string | null
  aadhaarNumber?: string | null
  address?: string | null
  policeStationName?: string | null
  email?: string | null
  workPurpose?: string | null
  stallAmountRupees?: number
  isDirectAllotment?: boolean
}

export type CsvRowError = { rowNumber: number; message: string }
export type CsvRowWarning = { rowNumber: number; message: string }

export type ParsedCsv = {
  rows: ShopUnitCsvRow[]
  errors: CsvRowError[]
  warnings: CsvRowWarning[]
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
 * The downloadable blank template — header row, with example rows showing
 * available stalls, direct allotment with amount 0 (allotted), and direct allotment with amount > 0 (reserved).
 */
export function buildTemplateCsv(categoryNames: string[]): string {
  const exampleRows: string[][] = []

  // Sample row 1: Main Category, unallotted (Available)
  exampleRows.push([
    'S-101',
    'Single',
    categoryNames[0] || 'Refreshment and Ice Cream Booth/Stall',
    'North',
    'Available',
    '', '', '', '', '', '', '', '', '', ''
  ])

  // Sample row 2: Main Category, Direct Allotted with Amount = 0 (Free/Fully Allotted)
  exampleRows.push([
    'S-102',
    'Single',
    categoryNames[0] || 'Refreshment and Ice Cream Booth/Stall',
    'North',
    '',
    'KDB Quality Refreshments',
    'Harsh Gupta',
    'Sh. Rajesh Gupta',
    '7404302678',
    '123456789012',
    'Shop No 5, Near Gate 2, Kurukshetra',
    'City Police Station, Thanesar',
    'harshgarg1009@gmail.com',
    'Special Ice Cream & Cold Drinks',
    '0'
  ])

  // Sample row 3: Main Category, Direct Allotted with Amount > 0 (Reserved for Payment)
  exampleRows.push([
    'S-103',
    'Double',
    categoryNames[1] || 'Sweets, Bakers and Special Food Items',
    'East',
    '',
    'Royal Sweets & Bakers',
    'Amit Kumar',
    'Sh. Suresh Kumar',
    '7404302678',
    '987654321098',
    'Brahma Sarovar Road, Kurukshetra',
    'Krishna Gate Police Station',
    'harshgarg1009@gmail.com',
    'Traditional Sweets & Bakery',
    '5000'
  ])

  // Sample row 4: Custom Category, Unallotted (defaults to Reserved for Direct Allotment)
  exampleRows.push([
    'C-201',
    'Double',
    'VIP Exhibition Pavilion',
    'West',
    '',
    '', '', '', '', '', '', '', '', '', ''
  ])

  // Remaining categories as standard template rows
  categoryNames.slice(2).forEach((name, idx) => {
    exampleRows.push([
      `S-${200 + idx}`,
      idx % 2 === 0 ? 'Single' : 'Double',
      name,
      '',
      '',
      '', '', '', '', '', '', '', '', '', ''
    ])
  })

  return buildCsv([[...DIRECT_ALLOTMENT_CSV_COLUMNS], ...exampleRows])
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
  // Strip UTF-8 BOM if present
  const cleanedText = text.replace(/^\uFEFF/, '').trim()
  const lines = cleanedText.split(/\r\n|\r|\n/).filter(line => line.trim() !== '')

  if (lines.length === 0) {
    return { rows: [], errors: [{ rowNumber: 0, message: 'The file is empty.' }], warnings: [] }
  }

  const rawHeaders = parseCsvLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim())
  const colIndex = new Map<string, number>()
  rawHeaders.forEach((h, idx) => {
    const rawClean = h.toLowerCase().trim()
    const stripped = rawClean.replace(/[^\w\s/.-]/g, '').trim()
    colIndex.set(rawClean, idx)
    colIndex.set(stripped, idx)
  })

  // Intelligent column matcher by keywords & regex
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

  // Detect columns in ANY order
  const stallCol = findCol([
    'booth/stall no.', 'booth/stall no', 'stall no.', 'stall no', 'booth no.', 'booth no',
    'stall number', 'booth number', 'stall', 'booth', 'shop no.', 'shop no', 'unit no'
  ])
  const typeCol = findCol(['single/double', 'single or double', 'shop type', 'booth type', 'type', 'size'])
  const catCol = findCol(['category', 'category name', 'cat', 'trade'])
  const dirCol = findCol(['direction', 'facing', 'side'])
  const statusCol = findCol(['status', 'stall status', 'allotment status'])

  // Direct allotment columns
  const allotteeCol = findCol([
    'allottee name', 'allottee', 'organisation name', 'organization name', 'organisation',
    'vendor name', 'vendor', 'applicant name', 'applicant', 'firm name', 'firm', 'party name', 'name'
  ])
  const contactCol = findCol(['contact person', 'representative name', 'representative', 'contact', 'authorized person'])
  const fatherCol = findCol(['father name', "father's name", 'guardian name', 'father', 's/o', 'd/o'])
  const mobileCol = findCol(['mobile number', 'mobile no.', 'mobile no', 'mobile', 'phone number', 'phone no.', 'phone', 'whatsapp'])
  const aadhaarCol = findCol(['aadhaar number', 'aadhaar no.', 'aadhaar no', 'aadhaar', 'aadhar number', 'aadhar no', 'aadhar', 'uid'])
  const addressCol = findCol(['address', 'full address', 'residence', 'location'])
  const policeCol = findCol(['police station', 'police station name', 'thana', 'police thana', 'ps'])
  const emailCol = findCol(['email', 'email id', 'email address', 'e-mail'])
  const workCol = findCol(['work purpose', 'craft', 'purpose', 'craft / work purpose', 'item', 'items', 'business', 'activity'])
  const amountCol = findCol(['stall amount', 'stall amount (rs)', 'stall amount in rs', 'amount', 'fee', 'allotment fee', 'rate', 'price', 'emd amount'])

  // Check required core headers (at least stall and category)
  if (stallCol === -1 || catCol === -1) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          message: `Could not identify "Booth/Stall No." or "Category" columns. Please verify column headers.`
        }
      ],
      warnings: []
    }
  }

  const dataLines = lines.slice(1)

  if (dataLines.length > MAX_IMPORT_ROWS) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, message: `Too many rows (max ${MAX_IMPORT_ROWS} per import).` }],
      warnings: []
    }
  }

  const rows: ShopUnitCsvRow[] = []
  const errors: CsvRowError[] = []
  const warnings: CsvRowWarning[] = []
  const seenStallNumbers = new Set<string>()

  dataLines.forEach((line, idx) => {
    const rowNumber = idx + 2
    const fields = parseCsvLine(line)

    const stallNumber = stallCol !== -1 ? (fields[stallCol] ?? '').trim() : ''
    const shopTypeRaw = typeCol !== -1 ? (fields[typeCol] ?? '').trim().toLowerCase() : ''
    const categoryName = catCol !== -1 ? (fields[catCol] ?? '').trim().replace(/\s+/g, ' ') : ''
    const direction = dirCol !== -1 ? (fields[dirCol] ?? '').trim() : ''
    const statusRaw = statusCol !== -1 ? (fields[statusCol] ?? '').trim() : ''
    const statusText = statusRaw.toLowerCase()

    if (!stallNumber) {
      errors.push({ rowNumber, message: 'Booth/Stall No. is required.' })
      return
    }

    if (seenStallNumbers.has(stallNumber.toLowerCase())) {
      errors.push({ rowNumber, message: `Duplicate Booth/Stall No. "${stallNumber}" within this file.` })
      return
    }

    seenStallNumbers.add(stallNumber.toLowerCase())

    if (!categoryName) {
      errors.push({ rowNumber, message: 'Category is required.' })
      return
    }

    // Normalize Single/Double: defaults to single if not specified
    let shopType: 'single' | 'double' = 'single'
    if (shopTypeRaw.includes('double') || shopTypeRaw === 'd') {
      shopType = 'double'
    } else if (shopTypeRaw.includes('single') || shopTypeRaw === 's') {
      shopType = 'single'
    }

    // Direct Allotment fields
    const allotteeName = allotteeCol !== -1 ? (fields[allotteeCol] ?? '').trim() : ''
    const contactPerson = contactCol !== -1 ? (fields[contactCol] ?? '').trim() : ''
    const fatherName = fatherCol !== -1 ? (fields[fatherCol] ?? '').trim() : ''
    const mobileRaw = mobileCol !== -1 ? (fields[mobileCol] ?? '').trim() : ''
    const aadhaarRaw = aadhaarCol !== -1 ? (fields[aadhaarCol] ?? '').trim().replace(/^['"=]+|['"]+$/g, '').replace(/\D/g, '') : ''
    const address = addressCol !== -1 ? (fields[addressCol] ?? '').trim() : ''
    const policeStationName = policeCol !== -1 ? (fields[policeCol] ?? '').trim() : ''
    const email = emailCol !== -1 ? (fields[emailCol] ?? '').trim().toLowerCase() : ''
    const workPurpose = workCol !== -1 ? (fields[workCol] ?? '').trim() : ''
    const amountRaw = amountCol !== -1 ? (fields[amountCol] ?? '').trim().replace(/[^\d.]/g, '') : ''
    const stallAmountRupees = Math.max(0, Math.round(Number(amountRaw) || 0))

    const isDirectAllotment = Boolean(allotteeName)

    const cleanMobile = mobileRaw.replace(/\D/g, '').slice(-10)
    if (cleanMobile && cleanMobile.length !== 10) {
      errors.push({ rowNumber, message: 'Mobile number must be a valid 10-digit number if provided.' })
      return
    }
    if (aadhaarRaw && !/^\d{4}$|^\d{12}$/.test(aadhaarRaw)) {
      errors.push({ rowNumber, message: 'Aadhaar number must be exactly 12 digits or last 4 digits.' })
      return
    }

    // Mobile/Email are optional — the allotment letter and payment link are
    // sent via WhatsApp/email, so a row missing both can still be imported,
    // but the admin needs to know nothing will reach the allottee.
    if (isDirectAllotment && !cleanMobile && !email) {
      warnings.push({
        rowNumber,
        message: `"${allotteeName}" has no Mobile Number or Email — the allotment letter will NOT be sent automatically. Add contact details later from the Direct Allotment edit form to send it.`
      })
    }

    // Flexible Status Detection (supports "Reserved for Allotment", "Direct Allotment", etc.)
    let status: ShopUnitStatus = 'available'
    let explicitStatus: string | null = null

    if (statusText) {
      if (statusText.includes('available') || statusText === 'open') {
        status = 'available'
        explicitStatus = 'available'
      } else if (
        statusText.includes('reserved for direct') ||
        statusText.includes('reserved for allotment') ||
        statusText.includes('direct allotment') ||
        statusText.includes('reserved_for_direct') ||
        statusText === 'reserved' ||
        statusText === 'direct' ||
        statusText === 'hold'
      ) {
        status = 'reserved_for_direct_allotment'
        explicitStatus = 'reserved_for_direct_allotment'
      } else if (statusText.includes('allotted')) {
        status = 'allotted'
        explicitStatus = 'allotted'
      } else if (statusText.includes('payment')) {
        status = 'reserved'
        explicitStatus = 'reserved'
      }
    }

    // An allottee name always means this stall is allotted to them, no
    // matter what (or whether) the Status column says — simplest, most
    // predictable rule per explicit request: "Alloted To" having a name
    // means allotted.
    if (allotteeName) {
      status = 'allotted'
      explicitStatus = 'allotted'
    }

    if (amountRaw && Number(amountRaw) > 0 && !cleanMobile) {
      warnings.push({
        rowNumber,
        message: `Stall amount is ₹${amountRaw} but no Mobile Number is provided — the payment link cannot be sent to "${allotteeName || stallNumber}". Add a mobile number to send it.`
      })
    }

    rows.push({
      rowNumber,
      stallNumber,
      shopType,
      categoryName,
      direction: direction || null,
      status,
      explicitStatus,
      allotteeName: allotteeName || null,
      contactPerson: contactPerson || null,
      fatherName: fatherName || null,
      mobileNumber: mobileRaw.replace(/\D/g, '').slice(-10) || null,
      aadhaarNumber: aadhaarRaw || null,
      address: address || null,
      policeStationName: policeStationName || null,
      email: email || null,
      workPurpose: workPurpose || null,
      stallAmountRupees,
      isDirectAllotment
    })
  })

  return { rows, errors, warnings }
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
