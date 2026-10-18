// Creates isolated, repeatable UAT-only draw data. Run with:
// node src/database/scripts/seed-draw-uat-data.mjs
//
// It never touches production categories or existing applications. The two
// closed categories it manages are deliberately labelled [UAT ONLY], so they
// cannot accept public applications. This script sends no notifications.
import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import mysql from 'mysql2/promise'

const directory = dirname(fileURLToPath(import.meta.url))
const root = join(directory, '..', '..', '..')
const env = {}

for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) {
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, '')
  }
}

const TEST_CONTACT = {
  email: 'harshgarg1009@gmail.com',
  mobile: '7404302678'
}

// UAT-only configured booth/stall allotment charge: ₹50,000. This is only
// displayed as test configuration; it never creates a payment or sends a link.
const UAT_ALLOTMENT_AMOUNT_PAISE = 5_000_000

const DATASETS = [
  {
    slug: 'uat-draw-payment-10x5',
    name: '[UAT ONLY] Draw & Payment — 10 Candidates / 5 Stalls',
    applicationPrefix: 'UAT-DRAW-10X5',
    candidates: 10,
    stalls: 5
  }
]

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function encryptSyntheticAadhaar(value) {
  const key = Buffer.from(env.AADHAAR_ENCRYPTION_KEY ?? '', 'base64')

  if (key.length !== 32) {
    throw new Error('AADHAAR_ENCRYPTION_KEY must be configured to create decryptable UAT applications.')
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])

  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
}

async function ensureCategory(connection, eventId, dataset, order) {
  const [existing] = await connection.query('SELECT id FROM categories WHERE event_id = ? AND slug = ? LIMIT 1', [eventId, dataset.slug])

  if (existing.length) {
    await connection.execute(
      `UPDATE categories
       SET allotment_amount_paise = ?,
           allotment_payment_enabled = 1,
           allotment_payment_deadline_at = DATE_ADD(NOW(), INTERVAL 3 DAY),
           allotment_amount_note = 'UAT test amount only — no real payment is due.',
           allotment_amount_note_hi = 'केवल UAT परीक्षण राशि — कोई वास्तविक भुगतान देय नहीं है।'
       WHERE id = ?`,
      [UAT_ALLOTMENT_AMOUNT_PAISE, Number(existing[0].id)]
    )
    return Number(existing[0].id)
  }

  const [result] = await connection.execute(
    `INSERT INTO categories (
       event_id, slug, name, name_hi, description, description_hi,
       selection_method, fee_paise, allotment_amount_paise,
       allotment_payment_enabled, allotment_payment_deadline_at,
       allotment_amount_note, allotment_amount_note_hi,
       status, display_order
     ) VALUES (?, ?, ?, ?, ?, ?, 'draw', 0, ?, 1, DATE_ADD(NOW(), INTERVAL 3 DAY), ?, ?, 'closed', ?)`,
    [
      eventId,
      dataset.slug,
      dataset.name,
      '[केवल UAT परीक्षण] ड्रॉ परीक्षण श्रेणी',
      'Synthetic UAT data only. Closed to public applications. Do not use for real allotments.',
      'केवल सिंथेटिक UAT परीक्षण डेटा। वास्तविक आवंटन के लिए उपयोग न करें।',
      UAT_ALLOTMENT_AMOUNT_PAISE,
      'UAT test amount only — no real payment is due.',
      'केवल UAT परीक्षण राशि — कोई वास्तविक भुगतान देय नहीं है।',
      9000 + order
    ]
  )

  return Number(result.insertId)
}

async function seedDataset(connection, categoryId, dataset) {
  for (let index = 1; index <= dataset.candidates; index++) {
    const applicationNumber = `${dataset.applicationPrefix}-${String(index).padStart(3, '0')}`
    const syntheticAadhaar = `90000000${String(index).padStart(4, '0')}`
    const aadhaarHash = sha256(`uat-only-${dataset.slug}-aadhaar-${index}`)
    const aadhaarCiphertext = encryptSyntheticAadhaar(syntheticAadhaar)
    const accessTokenHash = sha256(`uat-only-${dataset.slug}-access-${index}`)

    await connection.execute(
      `INSERT INTO applications (
         application_number, category_id, email, organisation_name,
         representative_name, father_name, aadhaar_ciphertext, aadhaar_last4, aadhaar_hash,
         address, state, district, pin_code, mobile_number, alternate_mobile,
         work_purpose, achievement_experience, remarks, status, access_token_hash,
         declaration_accepted_at, submitted_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'approved', ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         aadhaar_ciphertext = VALUES(aadhaar_ciphertext),
         aadhaar_last4 = VALUES(aadhaar_last4),
         aadhaar_hash = VALUES(aadhaar_hash)`,
      [
        applicationNumber,
        categoryId,
        TEST_CONTACT.email,
        `UAT Test Organisation ${index}`,
        `UAT Test Candidate ${index}`,
        'UAT Test Father',
        aadhaarCiphertext,
        syntheticAadhaar.slice(-4),
        aadhaarHash,
        'UAT Test Address — Not a real applicant',
        'Haryana',
        'Kurukshetra',
        '136118',
        TEST_CONTACT.mobile,
        'UAT draw/payment test entry only — no real applicant or payment.',
        'Synthetic UAT candidate.',
        `[UAT ONLY] ${dataset.name}; contact is the admin-approved test destination.`,
        accessTokenHash
      ]
    )
  }

  for (let index = 1; index <= dataset.stalls; index++) {
    const stallNumber = `${dataset.applicationPrefix}-STALL-${String(index).padStart(2, '0')}`

    await connection.execute(
      `INSERT INTO shop_units (category_id, stall_number, shop_type, direction, emd_amount_paise, status, allotted_to_application_id)
       VALUES (?, ?, 'single', 'UAT Test Zone', NULL, 'available', NULL)
       ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), shop_type = 'single', direction = 'UAT Test Zone'`,
      [categoryId, stallNumber]
    )
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  })

  try {
    await connection.beginTransaction()

    const [events] = await connection.query(
      `SELECT id FROM events WHERE status = 'active' ORDER BY id DESC LIMIT 1`
    )
    const [fallbackEvents] = events.length
      ? [events]
      : await connection.query(`SELECT id FROM events ORDER BY id DESC LIMIT 1`)
    const eventId = fallbackEvents[0]?.id

    if (!eventId) throw new Error('No event exists. Create an event before seeding UAT draw data.')

    for (const [order, dataset] of DATASETS.entries()) {
      const categoryId = await ensureCategory(connection, Number(eventId), dataset, order)
      await seedDataset(connection, categoryId, dataset)

      await connection.execute(
        `INSERT INTO audit_logs (actor_user_id, actor_role_key, action, module, entity_type, entity_id, new_value)
         VALUES (NULL, NULL, 'uat.draw_data_seeded', 'draw', 'category', ?, ?)`,
        [
          String(categoryId),
          JSON.stringify({ uatOnly: true, slug: dataset.slug, candidates: dataset.candidates, stalls: dataset.stalls })
        ]
      )
    }

    await connection.commit()
    console.log('UAT draw data ready: 3 candidates / 1 stall and 10 candidates / 5 stalls. No notifications were sent.')
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

main().catch(error => {
  console.error('UAT_DRAW_SEED_FAILED', error)
  process.exit(1)
})
