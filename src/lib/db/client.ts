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

    // Kept at 10 per explicit instruction — Hostinger support's own
    // recommendation for this DB user after 40 drove max_connections_per_hour
    // over its cap (2026-11-10/13 outages). maxIdle is intentionally equal
    // to connectionLimit — maxIdle < connectionLimit would force the pool
    // to immediately CLOSE any returned connection once more than maxIdle
    // are sitting idle, which is its own source of unnecessary churn; the
    // only thing that should ever close an idle connection here is
    // idleTimeout below.
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,

    // Bounds BOTH of the "just hangs forever" failure modes reported live
    // (one request took ~314 seconds) instead of only ever timing out
    // because the caller gave up: connectTimeout caps how long opening a
    // brand-new TCP/MySQL connection can take (no default in mysql2 —
    // without this, a stalled handshake on Hostinger's shared network can
    // hang indefinitely holding that pool slot). queueLimit caps how many
    // requests may queue waiting for a free connection before the pool
    // just rejects the next one outright (a fast, clear "too busy" error
    // query()'s caller can handle) instead of letting a queue grow
    // unbounded and every one of those requests wait just as long as
    // whatever is ahead of it.
    connectTimeout: 10000,
    queueLimit: 50,

    // Hostinger's max_connections_per_hour (500) counts every connection
    // CREATED in the rolling hour, not how many are open at once (confirmed
    // against Hostinger's own support docs) — so the fix is to open fewer
    // new connections overall, not to close idle ones faster. A previous
    // attempt at this (2026-11-12) set idleTimeout to 15000ms specifically
    // to beat Hostinger's own short server-side wait_timeout and avoid a
    // "query on an already-dead connection" failure — but a 15s idle
    // timeout forces this pool to open a fresh connection after every ~15s
    // gap in traffic, which churns through FAR more new connections per
    // hour than before, and tipped the DB user over max_connections_per_hour
    // again the very next day (confirmed live, 2026-11-13 — the whole site
    // down with a generic server error, not just admin pages this time).
    // idleTimeout raised back up to cut that churn; a connection genuinely
    // killed server-side before this timeout fires is now handled by
    // query()'s own stale-connection retry below instead of relying on
    // winning a timing race against a Hostinger wait_timeout this app can't
    // see or control.
    idleTimeout: 55000,

    // Keep pooled connections warm: with a remote DB each fresh connect costs ~1s+, and a
    // 60s idle timeout made the first request after a short pause (e.g. a settings save) pay it.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,

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

// Error codes meaning the connection itself died (server-side timeout, TCP
// reset, a dropped keepalive) rather than anything wrong with the query —
// the pool has already discarded that connection by the time this surfaces,
// so retrying immediately gets a genuinely different one. Deliberately NOT
// retrying anything else (a real SQL error, a constraint violation, bad
// input) — those would just fail identically again.
const TRANSIENT_CONNECTION_ERROR_CODES = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ER_SERVER_SHUTDOWN'
])

function isTransientConnectionError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code

  return typeof code === 'string' && TRANSIENT_CONNECTION_ERROR_CODES.has(code)
}

/**
 * Runs a parameterized query. Callers must always pass user input via `params`,
 * never interpolate it into `sql` directly — this is the SQL-injection boundary
 * for the whole app (see .ai/SECURITY.md).
 *
 * Retries exactly once on a transient connection-death error (see
 * TRANSIENT_CONNECTION_ERROR_CODES) — Hostinger's shared MySQL server can
 * silently close a pooled connection server-side at any moment regardless
 * of this pool's own idleTimeout; without this, that single unlucky request
 * fails with a raw connection error instead of just quietly getting a fresh
 * connection, which is what previously surfaced as a misleading "you don't
 * have access" screen (requirePermission()'s query hitting a dead
 * connection) or, worse, a site-wide crash.
 */
export async function query<T = unknown>(sql: string, params: ReadonlyArray<unknown> = []): Promise<T> {
  try {
    const [rows] = await getPool().execute(sql, params as mysql.ExecuteValues)

    return rows as T
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error

    const [rows] = await getPool().execute(sql, params as mysql.ExecuteValues)

    return rows as T
  }
}

/**
 * A connection-scoped query function, bound to one checked-out connection so
 * multiple statements run against the same connection instead of each
 * grabbing its own from the pool. Passed into the callback given to
 * withTransaction() or withPooledConnection().
 */
export type TransactionQuery = <T = unknown>(sql: string, params?: ReadonlyArray<unknown>) => Promise<T>

/**
 * Runs several independent reads against ONE pooled connection instead of
 * each calling query() (and thus checking out its own separate connection).
 * Unlike withTransaction(), this does not BEGIN/COMMIT — it's for read-only
 * fan-out, not atomicity. Use this when a single page/route would otherwise
 * fire many unrelated queries in parallel (Promise.all of query() calls),
 * each demanding its own pool slot: with connectionLimit capped low (see the
 * comment on connectionLimit above — kept at 10 per Hostinger), a handful of
 * such pages loading at once could by themselves exhaust the whole pool
 * before any other request gets a connection at all (confirmed: the
 * application detail page's old Promise.all of ~14 query() calls, counting
 * getApprovalChecklist()'s own, could alone demand more connections than
 * the entire pool has — see .ai/CHANGELOG.md 2026-11-13).
 */
export async function withPooledConnection<T>(fn: (query: TransactionQuery) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection()

  try {
    const scopedQuery: TransactionQuery = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params as mysql.ExecuteValues)

      return rows as never
    }

    return await fn(scopedQuery)
  } finally {
    connection.release()
  }
}

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
