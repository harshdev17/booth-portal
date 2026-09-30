import mysql from 'mysql2/promise'

// Singleton connection pool. Reused across requests/server actions instead of
// opening a new connection per call. Never import this from a 'use client' file.
let pool: mysql.Pool | null = null

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function getPool(): mysql.Pool {
  if (pool) return pool

  pool = mysql.createPool({
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,

    // dateStrings avoids timezone-conversion surprises when reading DATETIME columns.
    dateStrings: true
  })

  // This project always targets IST (India-only portal). The Hostinger
  // MySQL server's own system clock runs in UTC (confirmed live: `SELECT
  // NOW()` returned real UTC time, not IST) while application code writes
  // DATETIME values from JS `Date` objects, which mysql2 correctly converts
  // to IST wall-clock strings before storing (its `timezone` pool option
  // controls only that client-side conversion — it does NOT change what
  // the MySQL session's own NOW()/CURRENT_TIMESTAMP computes, confirmed by
  // testing it directly). That mismatch meant every raw SQL `NOW()`/
  // `CURRENT_TIMESTAMP` call (used in WHERE clauses and column defaults
  // alike) compared/stored UTC wall-clock time against columns that were
  // otherwise consistently IST — causing real bugs (a freshly-verified OTP
  // appearing expired; a category's own opens_at, set to "right now",
  // failing its own `<= NOW()` check). Explicitly running `SET time_zone`
  // on every new pooled connection is the only thing that actually changes
  // the session's own NOW()/CURRENT_TIMESTAMP — verified live. See
  // .ai/CHANGELOG.md 2026-09-30 entries.
  pool.on('connection', connection => {
    connection.query("SET time_zone = '+05:30'")
  })

  return pool
}

/**
 * Runs a parameterized query. Callers must always pass user input via `params`,
 * never interpolate it into `sql` directly — this is the SQL-injection boundary
 * for the whole app (see .ai/SECURITY.md).
 */
export async function query<T = unknown>(sql: string, params: ReadonlyArray<unknown> = []): Promise<T> {
  const [rows] = await getPool().execute(sql, params as mysql.ExecuteValues)

  return rows as T
}

/**
 * A connection-scoped query function, bound to one checked-out connection so
 * multiple statements participate in the same transaction. Passed into the
 * callback given to withTransaction() — never used outside of it.
 */
export type TransactionQuery = <T = unknown>(sql: string, params?: ReadonlyArray<unknown>) => Promise<T>

/**
 * Runs `fn` inside a single MySQL transaction: BEGIN, run the callback with a
 * connection-bound query function, COMMIT on success, ROLLBACK on any thrown
 * error (including a validation error thrown mid-callback). Use this for any
 * multi-statement write that must be all-or-nothing — e.g. creating an
 * application plus its field values plus its documents (see
 * .ai/DATABASE.md, .ai/SECURITY.md "DB transaction for final application
 * creation").
 */
export async function withTransaction<T>(fn: (query: TransactionQuery) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection()

  try {
    await connection.beginTransaction()

    const scopedQuery: TransactionQuery = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params as mysql.ExecuteValues)

      return rows as never
    }

    const result = await fn(scopedQuery)

    await connection.commit()

    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
