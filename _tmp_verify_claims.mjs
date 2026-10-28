import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'
const root = 'D:/shadcn-nextjs-admincn-admin-template-free-main/shadcn-nextjs-admincn-admin-template-free-main'
const env = {}
for (const line of readFileSync(root + '/.env.local', 'utf8').split('\n')) {
  const index = line.indexOf('=')
  if (index > 0 && !line.trim().startsWith('#')) env[line.slice(0, index).trim()] = line.slice(index + 1).trim().replace(/^"|"$/g, '')
}
const connection = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT || 3306), user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME })

console.log('--- khadi-other-reserved status ---')
console.log((await connection.query("SELECT id, slug, name, status FROM categories WHERE slug = 'khadi-other-reserved'"))[0])

console.log('--- show_on_homepage column exists? ---')
console.log((await connection.query("SHOW COLUMNS FROM categories LIKE 'show_on_homepage'"))[0])

console.log('--- brand-promotions category current fee/content ---')
console.log((await connection.query("SELECT id, slug, name, fee_paise, allotment_amount_paise FROM categories WHERE slug = 'brand-promotions'"))[0])

console.log('--- schema_migrations: 0057-0065 tracked? ---')
const [tracked] = await connection.query("SELECT filename FROM schema_migrations WHERE filename LIKE '00%' ORDER BY filename")
console.log(tracked.map(r => r.filename).filter(f => {
  const n = parseInt(f.slice(0,4))
  return n >= 57 && n <= 65
}))

await connection.end()
