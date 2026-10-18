// Applies only migration 0052. This targeted runner is needed because the
// historical schema_migrations table has earlier drift that blocks the general
// all-migrations runner; it does not mark or skip any unrelated migration.
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

const filename = '0052_approved_for_draw_status.sql'
const connection = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  multipleStatements: true
})

try {
  await connection.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
  )
  const [rows] = await connection.query('SELECT filename FROM schema_migrations WHERE filename = ?', [filename])

  if (rows.length) {
    console.log(`SKIP (already applied): ${filename}`)
  } else {
    await connection.query(readFileSync(join(root, 'src', 'database', 'migrations', filename), 'utf8'))
    await connection.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [filename])
    console.log(`APPLIED: ${filename}`)
  }
} finally {
  await connection.end()
}
