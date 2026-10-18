import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const directory = dirname(fileURLToPath(import.meta.url))
const root = join(directory, '..', '..', '..')
const env = {}

for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, '')
}

const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  multipleStatements: true,
})

console.log('Connected to DB:', env.DB_NAME)

// Check columns in categories
const [catCols] = await connection.query("SHOW COLUMNS FROM categories LIKE 'allotment_payment_enabled'")
console.log('categories.allotment_payment_enabled exists:', catCols.length > 0)

if (catCols.length === 0) {
  console.log('Applying 0053_category_allotment_payment_settings.sql...')
  const sql = readFileSync(join(root, 'src', 'database', 'migrations', '0053_category_allotment_payment_settings.sql'), 'utf8')
  await connection.query(sql)
  console.log('Successfully applied 0053_category_allotment_payment_settings.sql')
  await connection.execute('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)', ['0053_category_allotment_payment_settings.sql'])
}

// Check columns in direct_allotments
const [daCols] = await connection.query("SHOW COLUMNS FROM direct_allotments LIKE 'aadhaar_number'")
console.log('direct_allotments.aadhaar_number exists:', daCols.length > 0)
if (daCols.length === 0) {
  console.log('Applying 0054_direct_allotment_details.sql...')
  const sql54 = readFileSync(join(root, 'src', 'database', 'migrations', '0054_direct_allotment_details.sql'), 'utf8')
  await connection.query(sql54)
  console.log('Successfully applied 0054_direct_allotment_details.sql')
  await connection.execute('INSERT IGNORE INTO schema_migrations (filename) VALUES (?)', ['0054_direct_allotment_details.sql'])
}

// Check categories table columns now
const [allCatCols] = await connection.query("SHOW COLUMNS FROM categories")
console.log('categories columns:', allCatCols.map(c => c.Field))

await connection.end()
console.log('Done.')
