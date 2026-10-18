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

async function main() {
  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  })

  const [cols] = await pool.query('SHOW COLUMNS FROM notification_log')
  console.log('Columns:', cols.map(c => c.Field))

  const [rows] = await pool.query('SELECT * FROM notification_log ORDER BY id DESC LIMIT 5')
  console.log('Recent logs:', JSON.stringify(rows, null, 2))

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
