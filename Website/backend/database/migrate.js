const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { pool } = require('./client');

const migrationsDirectory = path.join(__dirname, 'migrations');

const run = async () => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query('ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY');

    const files = (await fs.readdir(migrationsDirectory))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const filename of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (existing.rowCount > 0) {
        console.log(`Skipping ${filename}`);
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
        console.log(`Applied ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
