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
