import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const idx = line.indexOf('=')
  if (idx > 0 && !line.trim().startsWith('#')) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"|"$/g, '')
  }
}

const conn = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME
})

const [cols] = await conn.query('DESCRIBE direct_allotments')
console.log('Columns in direct_allotments:', cols.map(c => c.Field))
await conn.end()
