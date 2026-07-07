# Backend Deployment to Railway

## Environment Variables Required

Add these to Railway dashboard:

```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_SSL=true
DB_POOL_SIZE=20
JWT_SECRET=your_secure_random_secret_here
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

## How to Deploy

1. Push code to GitHub
2. Go to railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select this repository
5. Add environment variables above
6. Railway will auto-detect Node.js and run `npm start`

## Database Migration

The database schema will be auto-initialized on first connection via Supabase.

## Testing Production URL

Once deployed, test the API at:
```
https://your-railway-url.com/
```

Should return:
```json
{ "message": "Society Management System API" }
```
