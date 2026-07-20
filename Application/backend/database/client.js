const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

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
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const normalizeSql = (sql) => {
  let normalized = sql
    .replace(/`/g, '"')
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s+30\s+MINUTE\)/gi, "NOW() + INTERVAL '30 minutes'")
    .replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s+6\s+MONTH\)/gi, "CURRENT_DATE - INTERVAL '6 months'")
    .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(/DATE_FORMAT\(([^,]+),\s*'%b'\)/gi, "TO_CHAR($1, 'Mon')")
    .replace(/MONTH\(([^)]+)\)/gi, 'EXTRACT(MONTH FROM $1)')
    .replace(/YEAR\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)')
    .replace(/\b(active|is_active)\s*=\s*1\b/gi, '$1 = TRUE')
    .replace(/\b(active|is_active)\s*=\s*0\b/gi, '$1 = FALSE');

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
  const result = await executor(toPostgresPlaceholders(normalizedSql), values);

  if (/^\s*INSERT\s+/i.test(sql)) {
    return [{ insertId: result.rows?.[0]?.id, affectedRows: result.rowCount }, result.fields];
  }

  if (/^\s*(UPDATE|DELETE)\s+/i.test(sql)) {
    return [{ affectedRows: result.rowCount }, result.fields];
  }

  return [result.rows, result.fields];
};

const promisePool = {
  async query(sql, values = []) {
    return runQuery((queryText, queryValues) => pool.query(queryText, queryValues), sql, values);
  },

  async getConnection() {
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
  await pool.query('SELECT 1');
  console.log('PostgreSQL database connection established');

  const fs = require('fs/promises');
  const path = require('path');
  const migrationsDirectory = path.join(__dirname, 'migrations');
  const client = await pool.connect();

  try {
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

module.exports = { pool, promisePool, initDatabase };
