// Removes only the two exact [UAT ONLY] draw datasets created by
// seed-draw-uat-data.mjs. Existing real applications/categories are never
// selected or deleted. Run with: node src/database/scripts/reset-draw-uat-data.mjs
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import mysql from 'mysql2/promise'

const directory = dirname(fileURLToPath(import.meta.url))
const root = join(directory, '..', '..', '..')
const env = {}
const UAT_SLUGS = ['uat-draw-preview-3x1', 'uat-draw-payment-10x5']

for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) {
    env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, '')
  }
}

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME
})

try {
  await connection.beginTransaction()
  const placeholders = UAT_SLUGS.map(() => '?').join(', ')
  const [categories] = await connection.query(
    `SELECT id, slug, name FROM categories WHERE slug IN (${placeholders}) AND name LIKE '[UAT ONLY]%' FOR UPDATE`,
    UAT_SLUGS
  )
  const categoryIds = categories.map(category => Number(category.id))

  if (categoryIds.length !== UAT_SLUGS.length) {
    throw new Error('Expected UAT categories were not found exactly; no data was removed.')
  }

  const categoryPlaceholders = categoryIds.map(() => '?').join(', ')
  // 1. Unlink shop_units from applications
  await connection.query(`UPDATE shop_units SET allotted_to_application_id = NULL WHERE category_id IN (${categoryPlaceholders})`, categoryIds)
  // 2. Clear payments & notifications for these applications
  await connection.query(`DELETE FROM payments WHERE application_id IN (SELECT id FROM applications WHERE category_id IN (${categoryPlaceholders}))`, categoryIds)
  await connection.query(`DELETE FROM notification_log WHERE application_id IN (SELECT id FROM applications WHERE category_id IN (${categoryPlaceholders}))`, categoryIds)
  // 3. Clear draw tables
  await connection.query(`DELETE FROM draw_allocations WHERE draw_event_id IN (SELECT id FROM draw_events WHERE category_id IN (${categoryPlaceholders}))`, categoryIds)
  await connection.query(`DELETE FROM draw_candidate_snapshots WHERE draw_event_id IN (SELECT id FROM draw_events WHERE category_id IN (${categoryPlaceholders}))`, categoryIds)
  await connection.query(`DELETE FROM draw_events WHERE category_id IN (${categoryPlaceholders})`, categoryIds)
  // 4. Delete stalls, applications, categories
  await connection.query(`DELETE FROM shop_units WHERE category_id IN (${categoryPlaceholders})`, categoryIds)
  await connection.query(`DELETE FROM applications WHERE category_id IN (${categoryPlaceholders})`, categoryIds)
  await connection.query(`DELETE FROM categories WHERE id IN (${categoryPlaceholders})`, categoryIds)
  await connection.commit()
  console.log('Removed only the two [UAT ONLY] draw datasets. No real category or application was touched.')
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  await connection.end()
}
