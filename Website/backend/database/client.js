const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const dns = require('dns');
const { AsyncLocalStorage } = require('async_hooks');

const requestDatabaseStorage = new AsyncLocalStorage();

const originalLookup = dns.lookup;
const resolver = new dns.Resolver();
try {
  resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {}

dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return originalLookup(hostname, options, callback);
  }
  originalLookup(hostname, options, (err, address, family) => {
    if (err && (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN')) {
      resolver.resolve4(hostname, (resErr, addresses) => {
        if (!resErr && addresses && addresses.length > 0) {
          if (options && options.all) {
            return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
          }
          return callback(null, addresses[0], 4);
        }
        return callback(err, address, family);
      });
    } else {
      return callback(err, address, family);
    }
  });
};

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.database') });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const useSsl = process.env.DATABASE_SSL !== 'false';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DATABASE_POOL_MAX || 20),
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

const normalizeSql = (sql) => {
  let normalized = sql
    .replace(/`/g, '"')
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s+30\s+MINUTE\)/gi, "NOW() + INTERVAL '30 minutes'")
    .replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s+6\s+MONTH\)/gi, "CURRENT_DATE - INTERVAL '6 months'")
    .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/DATE_FORMAT\(([^,]+),\s*'%b'\)/gi, "TO_CHAR($1, 'Mon')")
    .replace(/MONTH\(([^)]+)\)/gi, 'EXTRACT(MONTH FROM $1)')
    .replace(/YEAR\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)');

  if (/^\s*INSERT\s+/i.test(normalized) && !/\bRETURNING\b/i.test(normalized)) {
    normalized = `${normalized.trim()} RETURNING *`;
  }

  return normalized;
};

const toPostgresPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const runQuery = async (executor, sql, values = []) => {
  const showColumnsMatch = sql.match(/^\s*SHOW\s+COLUMNS\s+FROM\s+["`]?([a-zA-Z0-9_]+)["`]?\s*$/i);
  if (showColumnsMatch) {
    const result = await executor(
      `SELECT column_name AS "Field"
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [showColumnsMatch[1]]
    );
    return [result.rows, result.fields];
  }

  const normalizedSql = normalizeSql(sql);
  const startedAt = Date.now();
  let result;
  try {
    result = await executor(toPostgresPlaceholders(normalizedSql), values);
  } finally {
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= Number(process.env.SLOW_QUERY_MS || 250)) {
      const operation = normalizedSql.trim().match(/^([A-Z]+)/i)?.[1]?.toUpperCase() || 'QUERY';
      const table = normalizedSql.match(/\b(?:FROM|INTO|UPDATE|JOIN)\s+"?([a-zA-Z0-9_]+)/i)?.[1] || 'unknown';
      const context = requestDatabaseStorage.getStore();
      console.warn(`[DB_SLOW] ${operation} ${table} ${elapsedMs}ms tenant=${context?.societyId ?? 'none'}`);
    }
  }

  if (/^\s*INSERT\s+/i.test(sql)) {
    return [{ insertId: result.rows?.[0]?.id, affectedRows: result.rowCount }, result.fields];
  }

  if (/^\s*(UPDATE|DELETE)\s+/i.test(sql)) {
    return [{ affectedRows: result.rowCount }, result.fields];
  }

  return [result.rows, result.fields];
};

const contextExecutor = () => {
  const context = requestDatabaseStorage.getStore();
  return context?.client
    ? (queryText, queryValues) => context.client.query(queryText, queryValues)
    : (queryText, queryValues) => pool.query(queryText, queryValues);
};

const configureContext = async (client, { societyId = null, bypass = false } = {}) => {
  // One database round-trip instead of three for every context transition.
  await client.query(
    `SELECT set_config('role', 'society_tenant_app', false),
            set_config('app.tenant_bypass', $1, false),
            set_config('app.current_society_id', $2, false)`,
    [bypass ? 'on' : 'off', societyId == null ? '' : String(societyId)]
  );
};

const runWithRequestDatabaseContext = async (options, req, res, next) => {
  const existing = requestDatabaseStorage.getStore();
  if (existing?.client) {
    if (options?.bypass === true) {
      existing.societyId = null;
      existing.bypass = true;
      await configureContext(existing.client, existing);
    } else if (options?.societyId != null) {
      existing.societyId = Number(options.societyId);
      existing.bypass = false;
      await configureContext(existing.client, existing);
    }
    return next();
  }

  const client = await pool.connect();
  const context = {
    client,
    societyId: options?.societyId == null ? null : Number(options.societyId),
    bypass: options?.bypass === true,
    transactionDepth: 0,
    cleaned: false
  };
  if (options?.defer !== true) await configureContext(client, context);

  const cleanup = async () => {
    if (context.cleaned) return;
    context.cleaned = true;
    try {
      if (context.transactionDepth > 0) await client.query('ROLLBACK');
      await client.query(
        `SELECT set_config('app.current_society_id', '', false),
                set_config('app.tenant_bypass', '', false),
                set_config('role', 'none', false)`
      );
    } catch (error) {
      console.error('Tenant database context cleanup failed:', error.message);
    } finally {
      client.release();
    }
  };

  res.once('finish', cleanup);
  res.once('close', cleanup);
  requestDatabaseStorage.run(context, next);
};

const setRequestSocietyId = async (societyId) => {
  const context = requestDatabaseStorage.getStore();
  if (!context?.client) throw new Error('No request database context is active');
  const value = Number(societyId);
  if (!Number.isInteger(value) || value <= 0) throw new Error('A valid society id is required');
  context.societyId = value;
  context.bypass = false;
  await configureContext(context.client, context);
};

// Used when the authentication query itself applied the secure database role
// and tenant GUCs in the same round trip as the server-owned user lookup.
const adoptConfiguredRequestContext = ({ societyId = null, bypass = false } = {}) => {
  const context = requestDatabaseStorage.getStore();
  if (!context?.client) throw new Error('No request database context is active');
  context.societyId = societyId == null ? null : Number(societyId);
  context.bypass = bypass === true;
};

const promisePool = {
  async query(sql, values = []) {
    return runQuery(contextExecutor(), sql, values);
  },

  async getConnection() {
    const requestContext = requestDatabaseStorage.getStore();
    if (requestContext?.client) {
      return {
        async query(sql, values = []) {
          return runQuery((queryText, queryValues) => requestContext.client.query(queryText, queryValues), sql, values);
        },
        async beginTransaction() {
          await requestContext.client.query('BEGIN');
          requestContext.transactionDepth += 1;
        },
        async commit() {
          await requestContext.client.query('COMMIT');
          requestContext.transactionDepth = Math.max(0, requestContext.transactionDepth - 1);
        },
        async rollback() {
          await requestContext.client.query('ROLLBACK');
          requestContext.transactionDepth = Math.max(0, requestContext.transactionDepth - 1);
        },
        release() { /* request middleware owns this connection */ },
      };
    }
    const client = await pool.connect();
    return {
      async query(sql, values = []) {
        return runQuery((queryText, queryValues) => client.query(queryText, queryValues), sql, values);
      },
      async beginTransaction() {
        await client.query('BEGIN');
      },
      async commit() {
        await client.query('COMMIT');
      },
      async rollback() {
        await client.query('ROLLBACK');
      },
      release() {
        client.release();
      },
    };
  },
};

const initDatabase = async () => {
  let attempts = 0;
  while (attempts < 3) {
    try {
      await pool.query('SELECT 1');
      console.log('PostgreSQL database connection established');
      break;
    } catch (err) {
      attempts++;
      console.warn(`Database connection attempt ${attempts} failed: ${err.message}`);
      if (attempts >= 3) throw err;
      await new Promise((res) => setTimeout(res, 2000));
    }
  }

  const fs = require('fs/promises');
  const path = require('path');
  const migrationsDirectory = path.join(__dirname, 'migrations');
  const client = await pool.connect();

  try {
    // Migrations are trusted system operations and must remain able to evolve
    // tenant-protected tables after FORCE ROW LEVEL SECURITY is enabled.
    await client.query("SELECT set_config('app.tenant_bypass', 'on', false)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    try {
      await client.query('ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY');
    } catch (e) {
      // Ignore if RLS is already enabled
    }

    const files = (await fs.readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (existing.rowCount > 0) {
        console.log(`Skipping migration: ${filename}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`Applied migration: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to apply migration ${filename}:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  promisePool,
  initDatabase,
  runWithRequestDatabaseContext,
  setRequestSocietyId,
  adoptConfiguredRequestContext,
  requestDatabaseStorage
};
