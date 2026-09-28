// Creates (or resets) the first Super Admin account.
// Usage: node src/database/scripts/seed-super-admin.mjs "Full Name" "email@kdb.example" "StrongPassword123!"
//
// The password is REQUIRED as an argument — this script never invents or
// hardcodes a default password. Rotate it as the first action after login
// if it was shared over any channel.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..', '..', '..')

function loadEnvLocal() {
  const text = readFileSync(join(projectRoot, '.env.local'), 'utf-8')
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

function assertStrongPassword(password) {
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.')
  }

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
    throw new Error('Password must include lowercase, uppercase, a digit, and a symbol.')
  }
}

async function main() {
  const [fullName, email, password] = process.argv.slice(2)

  if (!fullName || !email || !password) {
    console.error('Usage: node src/database/scripts/seed-super-admin.mjs "Full Name" "email@kdb.example" "StrongPassword123!"')
    process.exit(1)
  }

  assertStrongPassword(password)

  const env = loadEnvLocal()

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  })

  const [roleRows] = await connection.execute("SELECT id FROM roles WHERE `key` = 'super_admin' LIMIT 1")

  if (roleRows.length === 0) {
    throw new Error("Role 'super_admin' not found — run migrations first (node src/database/scripts/migrate.mjs).")
  }

  const roleId = roleRows[0].id
  const passwordHash = await bcrypt.hash(password, 12)

  await connection.execute(
    `INSERT INTO users (full_name, email, password_hash, role_id, status, password_changed_at)
     VALUES (?, ?, ?, ?, 'active', NOW())
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       password_hash = VALUES(password_hash),
       role_id = VALUES(role_id),
       status = 'active',
       password_changed_at = NOW(),
       failed_login_count = 0,
       locked_until = NULL`,
    [fullName, email, passwordHash, roleId]
  )

  console.log(`Super Admin account ready for: ${email}`)
  console.log('Store the password securely (e.g. a password manager) — it is not stored anywhere in this repo.')

  await connection.end()
}

main().catch(err => {
  console.error('SEED_FAILED', err.message)
  process.exit(1)
})
