// One-off migration runner. Run with: node src/database/scripts/migrate.mjs
// Reads .env.local directly (no dotenv dependency) and applies every .sql
// file in src/database/migrations in filename order, tracked in a
// `schema_migrations` table so re-running is safe (already-applied files
// are skipped).
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..', '..', '..')
const migrationsDir = join(__dirname, '..', 'migrations')

function loadEnvLocal() {
  const path = join(projectRoot, '.env.local')
  const text = readFileSync(path, 'utf-8')
  const env = {}

  for (const line of text.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) continue

    const idx = trimmed.indexOf('=')

    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()

    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    env[key] = value
  }

  return env
}

async function main() {
  const env = loadEnvLocal()

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true
  })

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  const [appliedRows] = await connection.query('SELECT filename FROM schema_migrations')
  const applied = new Set(appliedRows.map(row => row.filename))

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`SKIP (already applied): ${file}`)
      continue
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8')

    console.log(`APPLYING: ${file}`)
    await connection.query(sql)
    await connection.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
    console.log(`APPLIED: ${file}`)
  }

  await connection.end()
  console.log('Migrations complete.')
}

main().catch(err => {
  console.error('MIGRATION_FAILED', err)
  process.exit(1)
})
