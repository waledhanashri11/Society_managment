# PostgreSQL database

This folder contains the PostgreSQL connection and versioned schema migrations
used by the Express backend.

## Configuration

Copy the PostgreSQL connection string from Supabase into `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.pgkrcfzrxzjfkllzkcwm:YOUR_URL_ENCODED_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
DATABASE_SSL=true
DB_POOL_SIZE=10
```

For a local PostgreSQL server, set `DATABASE_SSL=false`.

## Apply migrations

From the `backend` folder:

```bash
npm run migrate
```

Applied migration filenames are recorded in the `schema_migrations` table.
The application only verifies connectivity at startup; it does not mutate the
schema automatically.
