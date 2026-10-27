import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'
const root = 'D:/shadcn-nextjs-admincn-admin-template-free-main/shadcn-nextjs-admincn-admin-template-free-main'
const env = {}
for (const line of readFileSync(root + '/.env.local', 'utf8').split('\n')) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, '')
}
const connection = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME })

const [rows] = await connection.query("SELECT id, application_number, status, representative_name FROM applications WHERE category_id = 8")
console.log(rows)

await connection.end()
