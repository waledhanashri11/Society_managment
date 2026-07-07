const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
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

const toPostgresPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const promisePool = {
  async query(sql, values = []) {
    const result = await pool.query(toPostgresPlaceholders(sql), values);
    return [result.rows, result.fields];
  },
};

const initDatabase = async () => {
  await pool.query('SELECT 1');
  console.log('PostgreSQL database connection established');
};

module.exports = { pool, promisePool, initDatabase };
