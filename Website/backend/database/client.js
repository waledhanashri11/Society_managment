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
};

module.exports = { pool, promisePool, initDatabase };
