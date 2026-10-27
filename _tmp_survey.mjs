import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'
const root = 'D:/shadcn-nextjs-admincn-admin-template-free-main/shadcn-nextjs-admincn-admin-template-free-main'
const env = {}
for (const line of readFileSync(root + '/.env.local', 'utf8').split('\n')) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, '')
}
const connection = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME })

console.log('--- ALL categories ---')
const [cats] = await connection.query("SELECT id, slug, name, status, display_order FROM categories ORDER BY display_order")
console.log(cats)

console.log('--- Application counts per category ---')
const [appCounts] = await connection.query(
  `SELECT c.id, c.slug, c.name, COUNT(a.id) as app_count
   FROM categories c LEFT JOIN applications a ON a.category_id = c.id
   GROUP BY c.id, c.slug, c.name ORDER BY c.display_order`
)
console.log(appCounts)

console.log('--- Total applications, by status ---')
const [statusCounts] = await connection.query("SELECT status, COUNT(*) as cnt FROM applications GROUP BY status")
console.log(statusCounts)

await connection.end()
