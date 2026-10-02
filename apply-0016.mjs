import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  process.env[t.slice(0,i).trim()] = t.slice(i+1).trim().replace(/^["']|["']$/g, '')
}
const pool = mysql.createPool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, dateStrings: true })

const sql = readFileSync('src/database/migrations/0016_shop_inventory.sql', 'utf8')
const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'))
for (const stmt of statements) {
  await pool.query(stmt)
}
console.log('Migration 0016 applied.')

const [cols] = await pool.query(`SHOW COLUMNS FROM shop_units`)
console.log(cols.map(c => c.Field))

await pool.end()
