# Backend Deployment to Railway

This backend is a Node.js + Express service that connects to Supabase
PostgreSQL through `DATABASE_URL`.

## Railway service settings

- Root directory: `Website/backend`
- Start command: `npm start`
- App entry: `Server.js`

Railway provides `PORT` automatically. The backend also falls back to `5000`
for local development.

## Environment variables required

Add these in the Railway dashboard. Do not commit real values to Git.

```env
DATABASE_URL=your_supabase_postgresql_connection_string
JWT_SECRET=your_strong_secret_key
FRONTEND_URL=http://localhost:3000
NODE_ENV=production
DATABASE_SSL=true
DB_POOL_SIZE=20
```

After the frontend is deployed to Vercel, replace `FRONTEND_URL` with the
Vercel app URL, for example:

```env
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## Apply database migrations

After `DATABASE_URL` is configured, run migrations manually from Railway or
locally:

```bash
npm run migrate
```

The app checks the database connection when it starts. It does not create or
change tables automatically during normal startup.

## Health check

After deployment, open the Railway public backend URL. It should return:

```json
{ "message": "Society Management System API" }
```
