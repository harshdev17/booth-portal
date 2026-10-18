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

  console.log('Modifying direct_allotments status enum to include cancelled...')
  await pool.query(`
    ALTER TABLE direct_allotments
    MODIFY COLUMN status ENUM('active', 'interchanged', 'cancelled') NOT NULL DEFAULT 'active'
  `)
  console.log('Successfully updated direct_allotments status enum!')

  const [cols] = await pool.query("SHOW COLUMNS FROM direct_allotments LIKE 'status'")
  console.log('Updated direct_allotments status column:', cols)

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
