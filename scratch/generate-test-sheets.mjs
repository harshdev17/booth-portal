import fs from 'node:fs'
import path from 'node:path'

function escapeCsvField(val) {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers, rows) {
  const allRows = [headers, ...rows]
  return allRows.map(row => row.map(escapeCsvField).join(',')).join('\r\n')
}

const headers = [
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
]

// Test Sheet 1: All Cases
const allCasesRows = [
  // 1. Main Cat + Direct Allotment + Amount 0 => Status: Allotted (Free)
  [
    'TEST-101',
    'Single',
    'Refreshment and Ice Cream Booth/Stall',
    'North',
    '',
    'Garg Sweets & Refreshments',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '123456789012',
    'Shop No 5, Near Gate No. 2, Kurukshetra',
    'City Police Station, Thanesar',
    'harshgarg1009@gmail.com',
    'Refreshment & Ice Cream Stall',
    '0'
  ],
  // 2. Main Cat with COMMA in name + Direct Allotment + Amount > 0 => Status: Reserved for Payment
  [
    'TEST-102',
    'Double',
    'Sweets, Bakers and Special Food Items',
    'East',
    '',
    'Kurukshetra Special Bakers',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '987654321098',
    'Brahma Sarovar Road, Kurukshetra',
    'Krishna Gate Police Station',
    'harshgarg1009@gmail.com',
    'Bakery Items & Special Sweets',
    '5000'
  ],
  // 3. Main Cat + Unallotted + Blank Status => Defaults to Available
  [
    'TEST-103',
    'Single',
    'Artisan Card Holders',
    'West',
    '',
    '', '', '', '', '', '', '', '', '', ''
  ],
  // 4. Main Cat + Unallotted + "Reserved for Allotment" => Status: Reserved for Direct Allotment
  [
    'TEST-104',
    'Single',
    'Refreshment and Ice Cream Booth/Stall',
    'North',
    'Reserved for Allotment',
    '', '', '', '', '', '', '', '', '', ''
  ],
  // 5. Custom Cat + Direct Allotment + Amount 0 => Status: Allotted
  [
    'TEST-201',
    'Single',
    'VIP Cultural Pavilion',
    'South',
    '',
    'Haryana Heritage Foundation',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '112233445566',
    'Sector 7, Urban Estate, Kurukshetra',
    'Sector 7 Police Station',
    'harshgarg1009@gmail.com',
    'Cultural Exhibition Stall',
    '0'
  ],
  // 6. Custom Cat + Direct Allotment + Amount > 0 => Status: Reserved for Payment
  [
    'TEST-202',
    'Double',
    'Commercial Brand Lounge',
    'North-East',
    '',
    'Garg Mega Brands Pvt Ltd',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '665544332211',
    'Main Commercial Complex, Kurukshetra',
    'City Police Station, Thanesar',
    'harshgarg1009@gmail.com',
    'Brand Promotion & Product Display',
    '15000'
  ],
  // 7. Custom Cat + Unallotted => Strictly Reserved for Direct Allotment (Can NEVER be Available!)
  [
    'TEST-203',
    'Double',
    'Corporate Expo Center',
    'South-West',
    '',
    '', '', '', '', '', '', '', '', '', ''
  ],
  // 8. Main Cat + Unallotted + Explicit "Available" => Available
  [
    'TEST-105',
    'Single',
    'National Awardees',
    'East',
    'Available',
    '', '', '', '', '', '', '', '', '', ''
  ]
]

// Test Sheet 2: Re-upload Corrections
const reuploadRows = [
  // 1. Updated direction and work purpose
  [
    'TEST-101',
    'Single',
    'Refreshment and Ice Cream Booth/Stall',
    'North-Facing Main Entry',
    '',
    'Garg Sweets & Refreshments',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '123456789012',
    'Shop No 5, Near Gate No. 2, Kurukshetra',
    'City Police Station, Thanesar',
    'harshgarg1009@gmail.com',
    'Artisan Ice Cream & Special Sweets',
    '0'
  ],
  // 2. Updated amount from 5000 to 7500 and direction
  [
    'TEST-102',
    'Double',
    'Sweets, Bakers and Special Food Items',
    'South-East',
    '',
    'Kurukshetra Special Bakers',
    'Harsh Garg (Proprietor)',
    'Sh. Ramesh Garg',
    '7404302678',
    '987654321098',
    'Brahma Sarovar Road, Kurukshetra',
    'Krishna Gate Police Station',
    'harshgarg1009@gmail.com',
    'Bakery Items & Special Sweets',
    '7500'
  ],
  // 3. Updated direction
  [
    'TEST-103',
    'Single',
    'Artisan Card Holders',
    'West Gate',
    '',
    '', '', '', '', '', '', '', '', '', ''
  ],
  // 4. Reserved for Direct Allotment
  [
    'TEST-104',
    'Single',
    'Refreshment and Ice Cream Booth/Stall',
    'North-Facing',
    'Reserved for Direct Allotment',
    '', '', '', '', '', '', '', '', '', ''
  ],
  // 5. Updated address
  [
    'TEST-201',
    'Single',
    'VIP Cultural Pavilion',
    'South',
    '',
    'Haryana Heritage Foundation',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '112233445566',
    'Plot 14, Sector 7, Urban Estate, Kurukshetra',
    'Sector 7 Police Station',
    'harshgarg1009@gmail.com',
    'Cultural Exhibition Stall',
    '0'
  ],
  // 6. Updated amount from 15000 to 12000
  [
    'TEST-202',
    'Double',
    'Commercial Brand Lounge',
    'North-East',
    '',
    'Garg Mega Brands Pvt Ltd',
    'Harsh Garg',
    'Sh. Ramesh Garg',
    '7404302678',
    '665544332211',
    'Main Commercial Complex, Kurukshetra',
    'City Police Station, Thanesar',
    'harshgarg1009@gmail.com',
    'Brand Promotion & Product Display',
    '12000'
  ],
  // 7. Updated direction
  [
    'TEST-203',
    'Double',
    'Corporate Expo Center',
    'South-West Plaza',
    '',
    '', '', '', '', '', '', '', '', '', ''
  ],
  // 8. Brand new stall added on re-upload
  [
    'TEST-301',
    'Single',
    'Refreshment and Ice Cream Booth/Stall',
    'North Gate',
    'Available',
    '', '', '', '', '', '', '', '', '', ''
  ]
]

const csvAllCases = toCsv(headers, allCasesRows)
const csvReupload = toCsv(headers, reuploadRows)

const testSheetsDir = path.resolve('test-sheets')
if (!fs.existsSync(testSheetsDir)) {
  fs.mkdirSync(testSheetsDir, { recursive: true })
}

const file1 = path.join(testSheetsDir, 'inventory_test_all_cases.csv')
const file2 = path.join(testSheetsDir, 'inventory_test_reupload_corrections.csv')

fs.writeFileSync(file1, csvAllCases, 'utf-8')
fs.writeFileSync(file2, csvReupload, 'utf-8')

console.log('Written to workspace test-sheets directory successfully.')
